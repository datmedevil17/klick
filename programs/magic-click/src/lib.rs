use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

// Ephemeral Rollups SDK imports
use ephemeral_rollups_sdk::anchor::{delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};

declare_id!("3VSkWYyeN3HakXT1qEzTgDPz3TifvLcezD4x2wKtv7vx");

#[ephemeral]
#[program]
pub mod typing_speed_game {
    use super::*;

    /// Initialize a new typing session
    pub fn start_typing_session(ctx: Context<StartTypingSession>) -> Result<()> {
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
        session.bump = ctx.bumps.session;

        msg!("Typing session started for player: {}", session.player);
        msg!("Start typing! Each word is a transaction.");

        emit!(TypingSessionStarted {
            player: session.player,
            timestamp: session.started_at,
        });

        Ok(())
    }

    /// Delegate the session PDA to an ER validator
    pub fn delegate_typing_session(ctx: Context<DelegateTypingSession>) -> Result<()> {
        let session = &ctx.accounts.session;
        require!(session.is_active, ErrorCode::SessionNotActive);

        ctx.accounts.delegate_session(
            &ctx.accounts.payer,
            &[SESSION_SEED, session.player.as_ref()],
            DelegateConfig {
                commit_frequency_ms: 30_000, // 30 seconds
                validator: Some(
                    "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"
                        .parse::<Pubkey>()
                        .unwrap(),
                ),
            },
        )?;

        msg!("Typing session delegated to Ephemeral Rollup validator");
        Ok(())
    }

    /// Record a typed word
    pub fn type_word(ctx: Context<TypeWord>, is_correct: bool) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(session.is_active, ErrorCode::SessionNotActive);

        session.words_typed = session.words_typed.saturating_add(1);
        
        if is_correct {
            session.correct_words = session.correct_words.saturating_add(1);
        } else {
            session.errors = session.errors.saturating_add(1);
        }

        // Calculate accuracy
        if session.words_typed > 0 {
            session.accuracy = ((session.correct_words as f64 / session.words_typed as f64) * 100.0) as u8;
        }

        msg!(
            "Word #{} - Player: {} | Correct: {} | Status: {}",
            session.words_typed,
            session.player,
            is_correct,
            if is_correct { "✓" } else { "✗" }
        );

        emit!(WordTyped {
            player: session.player,
            word_number: session.words_typed,
            is_correct,
            current_accuracy: session.accuracy,
        });

        Ok(())
    }

    /// Periodic checkpoint during typing
    pub fn checkpoint_typing(ctx: Context<CheckpointTyping>) -> Result<()> {
        let session = &ctx.accounts.session;
        require!(session.is_active, ErrorCode::SessionNotActive);

        commit_accounts(
            &ctx.accounts.magic_context,
            vec![&session.to_account_info()],
            &ctx.accounts.magic_program,
            &ctx.accounts.payer.to_account_info(),
        )?;

        msg!(
            "Checkpoint: Player {} | Words: {} | Accuracy: {}%",
            session.player,
            session.words_typed,
            session.accuracy
        );

        emit!(TypingCheckpoint {
            player: session.player,
            words_typed: session.words_typed,
            accuracy: session.accuracy,
        });

        Ok(())
    }

    /// End typing session and save to personal record (auto-initializes if needed)
    pub fn end_typing_session(ctx: Context<EndTypingSession>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let session_info = session.to_account_info();
        let personal_record = &mut ctx.accounts.personal_record;
        let clock = Clock::get()?;
        
        // Auto-initialize personal record if this is first attempt
        if personal_record.attempt_count == 0 && personal_record.player == Pubkey::default() {
            personal_record.player = ctx.accounts.player.key();
            personal_record.bump = ctx.bumps.personal_record;
            msg!("Personal record auto-initialized for player: {}", personal_record.player);
        }
        
        require!(session.is_active, ErrorCode::SessionNotActive);

        session.is_active = false;
        session.ended_at = Some(clock.unix_timestamp);

        let duration = session.ended_at.unwrap_or(clock.unix_timestamp) - session.started_at;
        
        // Calculate WPM (Words Per Minute)
        if duration > 0 {
            let minutes = duration as f64 / 60.0;
            session.wpm = (session.correct_words as f64 / minutes) as u16;
        }

        msg!("Typing session ended for player: {}", session.player);
        msg!("Total words typed: {}", session.words_typed);
        msg!("Correct words: {}", session.correct_words);
        msg!("Errors: {}", session.errors);
        msg!("WPM: {}", session.wpm);
        msg!("Accuracy: {}%", session.accuracy);
        msg!("Duration: {} seconds", duration);

        // Save to personal record history
        require!(
            personal_record.attempt_count < MAX_ATTEMPTS,
            ErrorCode::MaxAttemptsReached
        );

        let attempt = TypingAttempt {
            attempt_number: personal_record.attempt_count + 1,
            words_typed: session.words_typed,
            correct_words: session.correct_words,
            errors: session.errors,
            wpm: session.wpm,
            accuracy: session.accuracy,
            duration,
            timestamp: session.ended_at.unwrap(),
        };

        // compute index first to avoid simultaneous immutable and mutable borrows of personal_record
        let idx = personal_record.attempt_count as usize;
        personal_record.attempts[idx] = attempt;
        personal_record.attempt_count = personal_record.attempt_count.saturating_add(1);
        personal_record.total_words_typed = personal_record.total_words_typed.saturating_add(session.words_typed.into());
        personal_record.total_correct_words = personal_record.total_correct_words.saturating_add(session.correct_words.into());

        // Update best scores
        if session.wpm > personal_record.best_wpm {
            personal_record.best_wpm = session.wpm;
        }
        if session.accuracy > personal_record.best_accuracy {
            personal_record.best_accuracy = session.accuracy;
        }

        // Undelegate and commit final state
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&session_info],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("Session successfully undelegated and committed");
        msg!("Personal record updated - Attempt #{}", personal_record.attempt_count);

        emit!(TypingSessionEnded {
            player: session.player,
            words_typed: session.words_typed,
            wpm: session.wpm,
            accuracy: session.accuracy,
            duration,
            attempt_number: personal_record.attempt_count,
        });

        // Close the session account and return lamports to player
        let session_lamports = session_info.lamports();
        **session_info.try_borrow_mut_lamports()? = 0;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? = ctx
            .accounts
            .player
            .to_account_info()
            .lamports()
            .checked_add(session_lamports)
            .unwrap();

        msg!("Session account closed, lamports returned to player");

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
        record.bump = ctx.bumps.personal_record;

        msg!("Personal record initialized for player: {}", record.player);

        Ok(())
    }

    /// View current session state
    pub fn get_session_state(ctx: Context<GetSessionState>) -> Result<SessionStateData> {
        let session = &ctx.accounts.session;
        Ok(SessionStateData {
            player: session.player,
            words_typed: session.words_typed,
            correct_words: session.correct_words,
            errors: session.errors,
            wpm: session.wpm,
            accuracy: session.accuracy,
            is_active: session.is_active,
            started_at: session.started_at,
            ended_at: session.ended_at,
        })
    }

    /// View personal record and all attempts
    pub fn get_personal_record(ctx: Context<GetPersonalRecord>) -> Result<PersonalRecordData> {
        let record = &ctx.accounts.personal_record;
        
        let mut attempts = Vec::new();
        for i in 0..record.attempt_count as usize {
            attempts.push(record.attempts[i]);
        }

        Ok(PersonalRecordData {
            player: record.player,
            attempt_count: record.attempt_count,
            total_words_typed: record.total_words_typed,
            total_correct_words: record.total_correct_words,
            best_wpm: record.best_wpm,
            best_accuracy: record.best_accuracy,
            attempts,
        })
    }
}

// =================== Constants ===================

pub const SESSION_SEED: &[u8] = b"typing_session";
pub const RECORD_SEED: &[u8] = b"personal_record";
pub const MAX_ATTEMPTS: u32 = 100;

// =================== Account Types ===================

#[account]
pub struct TypingSession {
    pub player: Pubkey,              // 32 bytes
    pub words_typed: u32,            // 4 bytes
    pub correct_words: u32,          // 4 bytes
    pub errors: u32,                 // 4 bytes
    pub wpm: u16,                    // 2 bytes (Words Per Minute)
    pub accuracy: u8,                // 1 byte (percentage)
    pub is_active: bool,             // 1 byte
    pub started_at: i64,             // 8 bytes
    pub ended_at: Option<i64>,       // 9 bytes (1 + 8)
    pub bump: u8,                    // 1 byte
}

impl TypingSession {
    pub const LEN: usize = 8 + 32 + 4 + 4 + 4 + 2 + 1 + 1 + 8 + 9 + 1; // 74 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Copy)]
pub struct TypingAttempt {
    pub attempt_number: u32,         // 4 bytes
    pub words_typed: u32,            // 4 bytes
    pub correct_words: u32,          // 4 bytes
    pub errors: u32,                 // 4 bytes
    pub wpm: u16,                    // 2 bytes
    pub accuracy: u8,                // 1 byte
    pub duration: i64,               // 8 bytes
    pub timestamp: i64,              // 8 bytes
}

impl TypingAttempt {
    pub const LEN: usize = 4 + 4 + 4 + 4 + 2 + 1 + 8 + 8; // 35 bytes
}

#[account]
pub struct PersonalRecord {
    pub player: Pubkey,                        // 32 bytes
    pub attempt_count: u32,                    // 4 bytes
    pub total_words_typed: u64,                // 8 bytes
    pub total_correct_words: u64,              // 8 bytes
    pub best_wpm: u16,                         // 2 bytes
    pub best_accuracy: u8,                     // 1 byte
    pub bump: u8,                              // 1 byte
    pub attempts: [TypingAttempt; MAX_ATTEMPTS as usize], // 35 * 100 = 3500 bytes
}

impl PersonalRecord {
    pub const LEN: usize = 8 + 32 + 4 + 8 + 8 + 2 + 1 + 1 + (TypingAttempt::LEN * MAX_ATTEMPTS as usize); // 3564 bytes
}

// =================== Account Contexts ===================

#[derive(Accounts)]
pub struct StartTypingSession<'info> {
    #[account(
        init,
        payer = payer,
        space = TypingSession::LEN,
        seeds = [SESSION_SEED, player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, TypingSession>,

    pub player: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateTypingSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        del,
        seeds = [SESSION_SEED, session.player.as_ref()],
        bump = session.bump
    )]
    pub session: Account<'info, TypingSession>,
}

#[derive(Accounts)]
pub struct TypeWord<'info> {
    #[account(
        mut,
        seeds = [SESSION_SEED, session.player.as_ref()],
        bump = session.bump,
        has_one = player
    )]
    pub session: Account<'info, TypingSession>,

    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct CheckpointTyping<'info> {
    #[account(
        mut,
        seeds = [SESSION_SEED, session.player.as_ref()],
        bump = session.bump
    )]
    pub session: Account<'info, TypingSession>,

    /// CHECK: Magic context account required by Ephemeral Rollups SDK
    #[account(mut)]
    pub magic_context: AccountInfo<'info>,

    /// CHECK: Ephemeral Rollups validator program account
    pub magic_program: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct EndTypingSession<'info> {
    #[account(
        mut,
        seeds = [SESSION_SEED, session.player.as_ref()],
        bump = session.bump,
        has_one = player,
        close = player
    )]
    pub session: Account<'info, TypingSession>,

    #[account(
        init_if_needed,
        payer = payer,
        space = PersonalRecord::LEN,
        seeds = [RECORD_SEED, player.key().as_ref()],
        bump
    )]
    pub personal_record: Account<'info, PersonalRecord>,

    #[account(mut)]
    pub player: Signer<'info>,

    /// CHECK: Magic context account required by Ephemeral Rollups SDK
    #[account(mut)]
    pub magic_context: AccountInfo<'info>,

    /// CHECK: Ephemeral Rollups validator program account
    pub magic_program: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitPersonalRecord<'info> {
    #[account(
        init,
        payer = payer,
        space = PersonalRecord::LEN,
        seeds = [RECORD_SEED, player.key().as_ref()],
        bump
    )]
    pub personal_record: Account<'info, PersonalRecord>,

    pub player: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetSessionState<'info> {
    #[account(
        seeds = [SESSION_SEED, session.player.as_ref()],
        bump = session.bump
    )]
    pub session: Account<'info, TypingSession>,
}

#[derive(Accounts)]
pub struct GetPersonalRecord<'info> {
    #[account(
        seeds = [RECORD_SEED, personal_record.player.as_ref()],
        bump = personal_record.bump
    )]
    pub personal_record: Account<'info, PersonalRecord>,
}

// =================== Return Types ===================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SessionStateData {
    pub player: Pubkey,
    pub words_typed: u32,
    pub correct_words: u32,
    pub errors: u32,
    pub wpm: u16,
    pub accuracy: u8,
    pub is_active: bool,
    pub started_at: i64,
    pub ended_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PersonalRecordData {
    pub player: Pubkey,
    pub attempt_count: u32,
    pub total_words_typed: u64,
    pub total_correct_words: u64,
    pub best_wpm: u16,
    pub best_accuracy: u8,
    pub attempts: Vec<TypingAttempt>,
}

// =================== Errors ===================

#[error_code]
pub enum ErrorCode {
    #[msg("Session is not active")]
    SessionNotActive,

    #[msg("Session already ended")]
    SessionAlreadyEnded,

    #[msg("Maximum attempts reached (100)")]
    MaxAttemptsReached,
}

// =================== Events ===================

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
    pub attempt_number: u32,
}