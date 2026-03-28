use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRecord {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub category_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryRecord {
    pub id: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub amount: f64,
    pub category_id: Option<String>,
    pub debt_id: Option<String>,
    pub note: Option<String>,
    pub entry_date: String,
    pub created_at: String,
    pub updated_at: String,
    pub source: String,
    pub is_estimated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebtRecord {
    pub id: String,
    pub name: String,
    pub lender: Option<String>,
    pub balance_current: f64,
    pub interest_rate: Option<f64>,
    pub minimum_payment: Option<f64>,
    pub due_day: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckInRecord {
    pub date: String,
    pub completed: bool,
    pub completed_at: Option<String>,
    pub is_partial: bool,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub data_path: String,
    pub backup_directory: String,
    pub export_directory: String,
    pub categories: Vec<CategoryRecord>,
    pub entries: Vec<EntryRecord>,
    pub debts: Vec<DebtRecord>,
    pub check_ins: Vec<CheckInRecord>,
    pub onboarding: OnboardingStateRecord,
    pub settings: UserSettingsRecord,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingStateRecord {
    pub has_completed_onboarding: bool,
    pub onboarding_completed_at: Option<String>,
    pub daily_check_in_time: Option<String>,
    pub reminders_enabled: bool,
    pub daily_review_mode: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettingsRecord {
    pub default_view: String,
    pub theme_mode: String,
    pub reminders_enabled: bool,
    pub reminder_time: String,
    pub reminder_days: Vec<i64>,
    pub catch_up_reminder_enabled: bool,
    pub debt_due_reminder_enabled: bool,
    pub quiet_hours_start: String,
    pub quiet_hours_end: String,
    pub weekend_reminders_enabled: bool,
    pub catch_up_prompt_mode: String,
    pub show_advanced_options: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInput {
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub amount: f64,
    pub category_id: Option<String>,
    pub debt_id: Option<String>,
    pub note: Option<String>,
    pub entry_date: String,
    pub source: String,
    pub is_estimated: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryFilters {
    pub entry_type: Option<String>,
    pub category_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DebtInput {
    pub id: Option<String>,
    pub name: String,
    pub lender: Option<String>,
    pub balance_current: f64,
    pub interest_rate: Option<f64>,
    pub minimum_payment: Option<f64>,
    pub due_day: Option<i64>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DebtPaymentInput {
    pub debt_id: String,
    pub amount: f64,
    pub entry_date: String,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckInInput {
    pub date: String,
    pub is_partial: bool,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingInput {
    pub daily_check_in_time: Option<String>,
    pub reminders_enabled: bool,
    pub daily_review_mode: Option<String>,
    pub selected_category_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettingsInput {
    pub default_view: String,
    pub theme_mode: String,
    pub reminders_enabled: bool,
    pub reminder_time: String,
    pub reminder_days: Vec<i64>,
    pub catch_up_reminder_enabled: bool,
    pub debt_due_reminder_enabled: bool,
    pub quiet_hours_start: String,
    pub quiet_hours_end: String,
    pub weekend_reminders_enabled: bool,
    pub catch_up_prompt_mode: String,
    pub show_advanced_options: bool,
}
