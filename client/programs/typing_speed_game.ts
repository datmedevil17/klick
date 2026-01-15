/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/typing_speed_game.json`.
 */
export type TypingSpeedGame = {
  "address": "G1NLwCxdN8rRvqVcUnHAyz93vaWfhBgGdRGEbasnmkKa",
  "metadata": {
    "name": "typingSpeedGame",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "commit",
      "docs": [
        "Manual commit the typing session account in the Ephemeral Rollup",
        "This persists the current state to the base layer (checkpoint)"
      ],
      "discriminator": [
        223,
        140,
        142,
        165,
        229,
        208,
        156,
        74
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegate",
      "docs": [
        "Delegate the typing session account to the delegation program",
        "Optionally set a specific validator from the first remaining account",
        "See: https://docs.magicblock.gg/pages/get-started/how-integrate-your-program/local-setup"
      ],
      "discriminator": [
        90,
        147,
        75,
        178,
        85,
        88,
        4,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                222,
                247,
                111,
                242,
                121,
                87,
                164,
                168,
                91,
                203,
                112,
                88,
                65,
                188,
                202,
                230,
                114,
                50,
                133,
                212,
                238,
                108,
                90,
                38,
                141,
                241,
                140,
                107,
                39,
                227,
                211,
                113
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "G1NLwCxdN8rRvqVcUnHAyz93vaWfhBgGdRGEbasnmkKa"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "endSession",
      "docs": [
        "End typing session and calculate final stats"
      ],
      "discriminator": [
        11,
        244,
        61,
        154,
        212,
        249,
        15,
        66
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "session.player",
                "account": "typingSession"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "initPersonalRecord",
      "docs": [
        "Initialize personal record account for a player"
      ],
      "discriminator": [
        235,
        48,
        97,
        27,
        132,
        102,
        127,
        23
      ],
      "accounts": [
        {
          "name": "personalRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  115,
                  111,
                  110,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize a new typing session with starting values",
        "Uses PDA derivation with player's public key for deterministic addresses"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "saveToRecord",
      "docs": [
        "Save session results to personal record",
        "This updates lifetime stats and best scores"
      ],
      "discriminator": [
        100,
        66,
        30,
        166,
        122,
        48,
        47,
        2
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "session.player",
                "account": "typingSession"
              }
            ]
          }
        },
        {
          "name": "personalRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  115,
                  111,
                  110,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "personal_record.player",
                "account": "personalRecord"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "typeWord",
      "docs": [
        "Record a typed word",
        "Session tokens allow delegated signing for high-frequency actions"
      ],
      "discriminator": [
        101,
        184,
        72,
        74,
        179,
        211,
        88,
        174
      ],
      "accounts": [
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "session.player",
                "account": "typingSession"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "isCorrect",
          "type": "bool"
        }
      ]
    },
    {
      "name": "undelegate",
      "docs": [
        "Undelegate the typing session account from the delegation program",
        "This commits and removes the account from the Ephemeral Rollup"
      ],
      "discriminator": [
        131,
        148,
        180,
        198,
        91,
        104,
        42,
        238
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "session",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "personalRecord",
      "discriminator": [
        203,
        189,
        231,
        89,
        6,
        229,
        169,
        171
      ]
    },
    {
      "name": "sessionToken",
      "discriminator": [
        233,
        4,
        115,
        14,
        46,
        21,
        1,
        15
      ]
    },
    {
      "name": "typingSession",
      "discriminator": [
        160,
        108,
        98,
        83,
        228,
        219,
        5,
        91
      ]
    }
  ],
  "events": [
    {
      "name": "typingCheckpoint",
      "discriminator": [
        30,
        106,
        96,
        76,
        58,
        252,
        122,
        189
      ]
    },
    {
      "name": "typingSessionEnded",
      "discriminator": [
        105,
        131,
        228,
        84,
        206,
        205,
        164,
        86
      ]
    },
    {
      "name": "typingSessionSaved",
      "discriminator": [
        66,
        115,
        129,
        230,
        83,
        106,
        226,
        170
      ]
    },
    {
      "name": "typingSessionStarted",
      "discriminator": [
        23,
        128,
        72,
        156,
        61,
        99,
        130,
        148
      ]
    },
    {
      "name": "wordTyped",
      "discriminator": [
        253,
        159,
        69,
        143,
        16,
        199,
        3,
        109
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "sessionNotActive",
      "msg": "Session is not active"
    },
    {
      "code": 6001,
      "name": "sessionAlreadyEnded",
      "msg": "Session already ended"
    },
    {
      "code": 6002,
      "name": "invalidAuth",
      "msg": "Invalid authentication"
    },
    {
      "code": 6003,
      "name": "maxAttemptsReached",
      "msg": "Maximum attempts reached (30)"
    },
    {
      "code": 6004,
      "name": "sessionStillActive",
      "msg": "Session is still active"
    }
  ],
  "types": [
    {
      "name": "personalRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "docs": [
              "The player who owns this record"
            ],
            "type": "pubkey"
          },
          {
            "name": "attemptCount",
            "docs": [
              "Total number of attempts"
            ],
            "type": "u32"
          },
          {
            "name": "totalWordsTyped",
            "docs": [
              "Lifetime words typed"
            ],
            "type": "u64"
          },
          {
            "name": "totalCorrectWords",
            "docs": [
              "Lifetime correct words"
            ],
            "type": "u64"
          },
          {
            "name": "bestWpm",
            "docs": [
              "Best WPM achieved"
            ],
            "type": "u16"
          },
          {
            "name": "bestAccuracy",
            "docs": [
              "Best accuracy achieved"
            ],
            "type": "u8"
          },
          {
            "name": "attempts",
            "docs": [
              "History of all attempts"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "typingAttempt"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "sessionToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "typingAttempt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "attemptNumber",
            "type": "u32"
          },
          {
            "name": "wordsTyped",
            "type": "u32"
          },
          {
            "name": "correctWords",
            "type": "u32"
          },
          {
            "name": "errors",
            "type": "u32"
          },
          {
            "name": "wpm",
            "type": "u16"
          },
          {
            "name": "accuracy",
            "type": "u8"
          },
          {
            "name": "duration",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "typingCheckpoint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "wordsTyped",
            "type": "u32"
          },
          {
            "name": "accuracy",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "typingSession",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "docs": [
              "The player who owns this session"
            ],
            "type": "pubkey"
          },
          {
            "name": "wordsTyped",
            "docs": [
              "Total words typed"
            ],
            "type": "u32"
          },
          {
            "name": "correctWords",
            "docs": [
              "Number of correct words"
            ],
            "type": "u32"
          },
          {
            "name": "errors",
            "docs": [
              "Number of errors"
            ],
            "type": "u32"
          },
          {
            "name": "wpm",
            "docs": [
              "Words per minute"
            ],
            "type": "u16"
          },
          {
            "name": "accuracy",
            "docs": [
              "Accuracy percentage"
            ],
            "type": "u8"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the session is active"
            ],
            "type": "bool"
          },
          {
            "name": "startedAt",
            "docs": [
              "Session start timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "endedAt",
            "docs": [
              "Session end timestamp"
            ],
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "typingSessionEnded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "wordsTyped",
            "type": "u32"
          },
          {
            "name": "wpm",
            "type": "u16"
          },
          {
            "name": "accuracy",
            "type": "u8"
          },
          {
            "name": "duration",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "typingSessionSaved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "attemptNumber",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "typingSessionStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "wordTyped",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "wordNumber",
            "type": "u32"
          },
          {
            "name": "isCorrect",
            "type": "bool"
          },
          {
            "name": "currentAccuracy",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
