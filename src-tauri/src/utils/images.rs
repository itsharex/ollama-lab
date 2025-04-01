use std::fs::create_dir_all;
use std::path::PathBuf;

use sqlx::{Executor, Sqlite};
use uuid::{ContextV7, Timestamp, Uuid};

use crate::image::{get_compressed_image, MODEL_IMAGE_SIZE};
use crate::models::images::{ImageEntry, ImageReturn};
use crate::errors::Error;
use crate::paths::local_data_dir;

pub async fn get_chat_image(
    executor: impl Executor<'_, Database = Sqlite>,
    image_id: i64,
    resize_to: Option<(u32, u32)>,
) -> Result<Option<ImageReturn>, Error> {
    Ok(
        match sqlx::query_as::<_, ImageEntry>(r#"
            SELECT id, chat_id, origin, path
            FROM prompt_images
            WHERE id = $1;
        "#)
            .bind(image_id)
            .fetch_optional(executor)
            .await?
        {
            Some(entry) => Some(entry.into_image_return(resize_to)?),
            None => None,
        }
    )
}

pub async fn get_chat_images(
    executor: impl Executor<'_, Database = Sqlite>,
    chat_id: i64,
    resize_to: Option<(u32, u32)>,
) -> Result<Vec<ImageReturn>, Error> {
    let entries = sqlx::query_as::<_, ImageEntry>(r#"
        SELECT id, chat_id, origin, path 
        FROM prompt_images 
        WHERE chat_id = $1;
    "#)
        .bind(chat_id)
        .fetch_all(executor)
        .await?;

    let mut ret = Vec::with_capacity(entries.len());

    for entry in entries {
        ret.push(entry.into_image_return(resize_to)?);
    }

    Ok(ret)
}

pub fn get_image_cache_path() -> Option<PathBuf> {
    let mut data_dir = local_data_dir()?;
    data_dir.push("images");

    Some(data_dir)
}

pub fn resolve_stored_image_path(path: &str) -> Option<PathBuf> {
    let path = PathBuf::from(path);
    let trimmed_path = path.file_name()?;

    let mut data_dir = get_image_cache_path()?;
    data_dir.push(trimmed_path);
    Some(data_dir)
}

pub fn save_image(origin: &str, reuse_local: bool) -> Result<String, Error> {
    if reuse_local {
        if let Some(mut assumed_path) = get_image_cache_path() {
            if let Some(origin_file_name) = PathBuf::from(origin).file_name() {
                assumed_path.push(origin_file_name);
                if assumed_path.try_exists().unwrap_or(false) {
                    if let Some(file_name) = assumed_path.file_name() {
                        if let Some(file_name) = file_name.to_str() {
                            return Ok(file_name.to_string());
                        }
                    }
                }
            }
        }
    }

    let path = PathBuf::from(origin);

    let file_uuid = Uuid::new_v7(Timestamp::now(ContextV7::new()));
    let mut dest_file_path = PathBuf::from(file_uuid.to_string());
    if let Some(ext) = path.extension() {
        dest_file_path.set_extension(ext);
    }

    let image = get_compressed_image(origin, MODEL_IMAGE_SIZE)?;
    let dest_file_name = dest_file_path.file_name().and_then(|f| f.to_str()).ok_or(Error::NotExists)?;
    let dest = resolve_stored_image_path(dest_file_name).ok_or(Error::NotExists)?;
    if let Some(parent_dir) = dest.parent() {
        create_dir_all(parent_dir)?;
    }

    image.save(&dest)?;
    
    Ok(dest_file_name.to_string())
}
