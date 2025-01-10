use std::{fmt::Display, str::FromStr};

use ollama_rs::error::OllamaError;
use serde::{Deserialize, Serialize};


#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    pub message: String,
}

impl Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CommandError {}

impl CommandError {
    pub fn new(message: &str) -> Self {
        Self{
            message: message.to_string(),
        }
    }
}

impl FromStr for CommandError {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self::new(s))
    }
}

impl From<String> for CommandError {
    fn from(value: String) -> Self {
        Self{ message: value }
    }
}

impl From<OllamaError> for CommandError {
    fn from(value: OllamaError) -> Self {
        format!("{}", value).into()
    }
}
