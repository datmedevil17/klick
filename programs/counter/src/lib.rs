use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

declare_id!("EuVuXeF5BjXoJi4FzcS6jMK4q6b17kAmcnBzVbLqg1Yn");

#[ephemeral]
#[program]
pub mod typing_speed_game {
    use super::*;

    /// Initialize a new typing session with starting values
    /// Uses PDA derivation with player's public key for deterministic addresses
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let clock = Clock::get()?;

        session.player = ctx.accounts.player.key();
        session.words_typed = 0;
        session.correct_words = 0;
        session.errors = 0; 
        session.is_active = true;
        session.started_at = clock.unix_timestamp;
        session.ended_at = None;
        session.wpm = 0;
        session.accuracy = 0;

        msg!(
            "PDA {} initialized - Typing session started for player: {}",
            session.key(),
            session.player
        );

        emit!(TypingSessionStarted {
            player: session.player,
            timestamp: session.started_at,
        });

        Ok(())
    }

    /// Initialize personal record account for a player
    pub fn init_personal_record(ctx: Context<InitPersonalRecord>) -> Result<()> {
        let record = &mut ctx.accounts.personal_record;

        record.player = ctx.accounts.player.key();
        record.attempt_count = 0;
        record.total_words_typed = 0;
        record.total_correct_words = 0;
        record.best_wpm = 0;
        record.best_accuracy = 0;

        msg!(
            "PDA {} initialized - Personal record for player: {}",
            record.key(),
            record.player
        );

        Ok(())
    }

    /// Record a typed word
    /// Session tokens allow delegated signing for high-frequency actions
    #[session_auth_or(
        ctx.accounts.session.player.key() == ctx.accounts.signer.key(),
        TypingError::InvalidAuth
    )]
    pub fn type_word(ctx: Context<Update>, is_correct: bool) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(session.is_active, TypingError::SessionNotActive);

        session.words_typed = session.words_typed.checked_add(1).unwrap();

        if is_correct {
            session.correct_words = session.correct_words.checked_add(1).unwrap();
        } else {
            session.errors = session.errors.checked_add(1).unwrap();
        }

        // Calculate accuracy
        if session.words_typed > 0 {
            session.accuracy =
                ((session.correct_words as f64 / session.words_typed as f64) * 100.0) as u8;
        }

        msg!(
            "PDA {} - Word #{} | Correct: {} | Accuracy: {}%",
            session.key(),
            session.words_typed,
            is_correct,
            session.accuracy
        );

        emit!(WordTyped {
            player: session.player,
            word_number: session.words_typed,
            is_correct,
            current_accuracy: session.accuracy,
        });

        Ok(())
    }

    /// End typing session and calculate final stats
    #[session_auth_or(
        ctx.accounts.session.player.key() == ctx.accounts.signer.key(),
        TypingError::InvalidAuth
    )]
    pub fn end_session(ctx: Context<Update>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let clock = Clock::get()?;

        require!(session.is_active, TypingError::SessionNotActive);

        session.is_active = false;
        session.ended_at = Some(clock.unix_timestamp);

        let duration = session.ended_at.unwrap() - session.started_at;

        // Calculate WPM (Words Per Minute)
        if duration > 0 {
            let minutes = duration as f64 / 60.0;
            session.wpm = (session.correct_words as f64 / minutes) as u16;
        }

        msg!(
            "PDA {} - Session ended | Words: {} | WPM: {} | Accuracy: {}% | Duration: {}s",
            session.key(),
            session.words_typed,
            session.wpm,
            session.accuracy,
            duration
        );

        emit!(TypingSessionEnded {
            player: session.player,
            words_typed: session.words_typed,
            wpm: session.wpm,
            accuracy: session.accuracy,
            duration,
        });

        Ok(())
    }

    /// Save session results to personal record
    /// This updates lifetime stats and best scores
    pub fn save_to_record(ctx: Context<SaveToRecord>) -> Result<()> {
        let session = &ctx.accounts.session;
        let personal_record = &mut ctx.accounts.personal_record;

        require!(!session.is_active, TypingError::SessionStillActive);
        require!(
            personal_record.attempt_count < MAX_ATTEMPTS,
            TypingError::MaxAttemptsReached
        );

        let duration = session.ended_at.unwrap_or(0) - session.started_at;

        let attempt = TypingAttempt {
            attempt_number: personal_record.attempt_count + 1,
            words_typed: session.words_typed,
            correct_words: session.correct_words,
            errors: session.errors,
            wpm: session.wpm,
            accuracy: session.accuracy,
            duration,
            timestamp: session.ended_at.unwrap_or(0),
        };

        let idx = personal_record.attempt_count as usize;
        personal_record.attempts[idx] = attempt;
        personal_record.attempt_count = personal_record.attempt_count.checked_add(1).unwrap();
        personal_record.total_words_typed = personal_record
            .total_words_typed
            .checked_add(session.words_typed.into())
            .unwrap();
        personal_record.total_correct_words = personal_record
            .total_correct_words
            .checked_add(session.correct_words.into())
            .unwrap();

        // Update best scores
        if session.wpm > personal_record.best_wpm {
            personal_record.best_wpm = session.wpm;
        }
        if session.accuracy > personal_record.best_accuracy {
            personal_record.best_accuracy = session.accuracy;
        }

        msg!(
            "PDA {} - Personal record updated - Attempt #{}",
            personal_record.key(),
            personal_record.attempt_count
        );

        emit!(TypingSessionSaved {
            player: session.player,
            attempt_number: personal_record.attempt_count,
        });

        Ok(())
    }

    // ========================================
    // MagicBlock Ephemeral Rollups Functions
    // ========================================

    /// Delegate the typing session account to the delegation program
    /// Optionally set a specific validator from the first remaining account
    /// See: https://docs.magicblock.gg/pages/get-started/how-integrate-your-program/local-setup
    pub fn delegate(ctx: Context<DelegateInput>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[ctx.accounts.payer.key().as_ref()],
            DelegateConfig {
                // Optionally set a specific validator from the first remaining account
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Manual commit the typing session account in the Ephemeral Rollup
    /// This persists the current state to the base layer (checkpoint)
    pub fn commit(ctx: Context<CommitInput>) -> Result<()> {
        commit_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.session.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!(
            "Checkpoint: Player {} | Words: {} | Accuracy: {}%",
            ctx.accounts.session.player,
            ctx.accounts.session.words_typed,
            ctx.accounts.session.accuracy
        );

        emit!(TypingCheckpoint {
            player: ctx.accounts.session.player,
            words_typed: ctx.accounts.session.words_typed,
            accuracy: ctx.accounts.session.accuracy,
        });

        Ok(())
    }

    /// Undelegate the typing session account from the delegation program
    /// This commits and removes the account from the Ephemeral Rollup
    pub fn undelegate(ctx: Context<CommitInput>) -> Result<()> {
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.session.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }
}

// ========================================
// Constants
// ========================================

pub const MAX_ATTEMPTS: u32 = 30;

// ========================================
// Account Structs
// ========================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + TypingSession::INIT_SPACE,
        seeds = [player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, TypingSession>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitPersonalRecord<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PersonalRecord::INIT_SPACE,
        seeds = [b"personal_record", player.key().as_ref()],
        bump
    )]
    pub personal_record: Account<'info, PersonalRecord>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts, Session)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [session.player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, TypingSession>,

    #[account(mut)]
    pub signer: Signer<'info>,

    #[session(signer = signer, authority = session.player.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

#[derive(Accounts)]
pub struct SaveToRecord<'info> {
    #[account(
        mut,
        seeds = [session.player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, TypingSession>,

    #[account(
        mut,
        seeds = [b"personal_record", personal_record.player.key().as_ref()],
        bump
    )]
    pub personal_record: Account<'info, PersonalRecord>,

    #[account(mut)]
    pub player: Signer<'info>,
}

/// Account context for delegating the session PDA
/// The #[delegate] macro adds necessary accounts for delegation
#[delegate]
#[derive(Accounts)]
pub struct DelegateInput<'info> {
    pub payer: Signer<'info>,
    /// CHECK: The PDA to delegate - validated by seeds constraint
    #[account(mut, del, seeds = [payer.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,
}

/// Account context for commit and undelegate operations
/// The #[commit] macro adds magic_context and magic_program accounts
#[commit]
#[derive(Accounts)]
pub struct CommitInput<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [payer.key().as_ref()], bump)]
    pub session: Account<'info, TypingSession>,
}

// ========================================
// Account Data
// ========================================

#[account]
#[derive(InitSpace)]
pub struct TypingSession {
    /// The player who owns this session
    pub player: Pubkey,
    /// Total words typed
    pub words_typed: u32,
    /// Number of correct words
    pub correct_words: u32,
    /// Number of errors
    pub errors: u32,
    /// Words per minute
    pub wpm: u16,
    /// Accuracy percentage
    pub accuracy: u8,
    /// Whether the session is active
    pub is_active: bool,
    /// Session start timestamp
    pub started_at: i64,
    /// Session end timestamp
    pub ended_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Copy, InitSpace)]
pub struct TypingAttempt {
    pub attempt_number: u32,
    pub words_typed: u32,
    pub correct_words: u32,
    pub errors: u32,
    pub wpm: u16,
    pub accuracy: u8,
    pub duration: i64,
    pub timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct PersonalRecord {
    /// The player who owns this record
    pub player: Pubkey,
    /// Total number of attempts
    pub attempt_count: u32,
    /// Lifetime words typed
    pub total_words_typed: u64,
    /// Lifetime correct words
    pub total_correct_words: u64,
    /// Best WPM achieved
    pub best_wpm: u16,
    /// Best accuracy achieved
    pub best_accuracy: u8,
    /// History of all attempts
    #[max_len(30)]
    pub attempts: Vec<TypingAttempt>,
}

// ========================================
// Events
// ========================================

#[event]
pub struct TypingSessionStarted {
    pub player: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WordTyped {
    pub player: Pubkey,
    pub word_number: u32,
    pub is_correct: bool,
    pub current_accuracy: u8,
}

#[event]
pub struct TypingCheckpoint {
    pub player: Pubkey,
    pub words_typed: u32,
    pub accuracy: u8,
}

#[event]
pub struct TypingSessionEnded {
    pub player: Pubkey,
    pub words_typed: u32,
    pub wpm: u16,
    pub accuracy: u8,
    pub duration: i64,
}

#[event]
pub struct TypingSessionSaved {
    pub player: Pubkey,
    pub attempt_number: u32,
}

// ========================================
// Errors
// ========================================

#[error_code]
pub enum TypingError {
    #[msg("Session is not active")]
    SessionNotActive,
    #[msg("Session already ended")]
    SessionAlreadyEnded,
    #[msg("Invalid authentication")]
    InvalidAuth,
    #[msg("Maximum attempts reached (30)")]
    MaxAttemptsReached,
    #[msg("Session is still active")]
    SessionStillActive,
}