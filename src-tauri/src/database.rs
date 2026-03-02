use sqlx::{SqlitePool, Row};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// 数据库连接池
static mut DB_POOL: Option<SqlitePool> = None;

// 初始化数据库连接
pub async fn init_database(data_dir: &str) -> Result<(), String> {
    let db_path = format!("{}/lemonc.db", data_dir);
    let connection_string = format!("sqlite:{}", db_path);

    let pool = SqlxPool::connect(&connection_string)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // 创建表
    create_tables(&pool).await?;

    unsafe {
        DB_POOL = Some(pool);
    }

    Ok(())
}

// 获取数据库连接池
fn get_pool() -> &'static SqlitePool {
    unsafe { DB_POOL.as_ref().expect("Database not initialized") }
}

// 创建所有表
async fn create_tables(pool: &SqlitePool) -> Result<(), String> {
    // 笔记表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create notes table: {}", e))?;

    // 待办表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            completed INTEGER DEFAULT 0,
            due_date INTEGER,
            priority TEXT DEFAULT 'medium',
            tags TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create todos table: {}", e))?;

    // 客户表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            tags TEXT,
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create customers table: {}", e))?;

    // 合同表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            contract_number TEXT NOT NULL,
            amount REAL NOT NULL,
            start_date INTEGER NOT NULL,
            end_date INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create contracts table: {}", e))?;

    // 跟进记录表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS follow_up_records (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            content TEXT NOT NULL,
            follow_up_date INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create follow_up_records table: {}", e))?;

    // 房贷计算表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS mortgage_calcs (
            id TEXT PRIMARY KEY,
            loan_amount REAL NOT NULL,
            loan_years INTEGER NOT NULL,
            interest_rate REAL NOT NULL,
            monthly_payment REAL NOT NULL,
            total_interest REAL NOT NULL,
            total_payment REAL NOT NULL,
            created_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create mortgage_calcs table: {}", e))?;

    // 收入计算表
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS income_calcs (
            id TEXT PRIMARY KEY,
            monthly_income REAL NOT NULL,
            tax_rate REAL NOT NULL,
            insurance_rate REAL NOT NULL,
            net_income REAL NOT NULL,
            annual_income REAL NOT NULL,
            created_at INTEGER NOT NULL,
            deleted INTEGER DEFAULT 0
        )
    "#)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create income_calcs table: {}", e))?;

    Ok(())
}

// 导出所有数据
#[tauri::command]
pub async fn export_all_data() -> Result<AllData, String> {
    let pool = get_pool();

    let notes: Vec<Note> = sqlx::query_as("SELECT id, title, content, tags, created_at, updated_at FROM notes WHERE deleted = 0")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch notes: {}", e))?;

    let todos: Vec<Todo> = sqlx::query_as("SELECT id, title, description, completed, due_date, priority, tags, created_at, updated_at FROM todos WHERE deleted = 0")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch todos: {}", e))?;

    let customers: Vec<Customer> = sqlx::query_as("SELECT id, name, phone, email, address, tags, notes, created_at, updated_at FROM customers WHERE deleted = 0")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch customers: {}", e))?;

    let contracts: Vec<Contract> = sqlx::query_as("SELECT id, customer_id, contract_number, amount, start_date, end_date, status, notes, created_at, updated_at FROM contracts WHERE deleted = 0")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch contracts: {}", e))?;

    Ok(AllData {
        version: "1.0".to_string(),
        export_time: Utc::now().to_rfc3339(),
        notes,
        todos,
        customers,
        contracts,
        follow_up_records: vec![],
        mortgage_calcs: vec![],
        income_calcs: vec![]
    })
}

// 导入所有数据
#[tauri::command]
pub async fn import_all_data(data: AllData) -> Result<(), String> {
    let pool = get_pool();

    // 导入笔记
    for note in data.notes {
        sqlx::query(
            "INSERT OR REPLACE INTO notes (id, title, content, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(&note.id)
        .bind(&note.title)
        .bind(&note.content)
        .bind(&note.tags)
        .bind(note.created_at.timestamp())
        .bind(note.updated_at.timestamp())
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert note: {}", e))?;
    }

    Ok(())
}

// 获取数据库统计信息
#[tauri::command]
pub async fn get_db_stats() -> Result<DbStats, String> {
    let pool = get_pool();

    let note_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notes WHERE deleted = 0")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get note count: {}", e))?;

    let todo_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM todos WHERE deleted = 0")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get todo count: {}", e))?;

    let customer_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers WHERE deleted = 0")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get customer count: {}", e))?;

    let contract_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM contracts WHERE deleted = 0")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get contract count: {}", e))?;

    Ok(DbStats {
        note_count,
        todo_count,
        customer_count,
        contract_count
    })
}

// 数据结构
#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: i32,
    pub due_date: Option<i64>,
    pub priority: String,
    pub tags: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tags: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Contract {
    pub id: String,
    pub customer_id: String,
    pub contract_number: String,
    pub amount: f64,
    pub start_date: i64,
    pub end_date: i64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize)]
pub struct AllData {
    pub version: String,
    pub export_time: String,
    pub notes: Vec<Note>,
    pub todos: Vec<Todo>,
    pub customers: Vec<Customer>,
    pub contracts: Vec<Contract>,
    pub follow_up_records: Vec<serde_json::Value>,
    pub mortgage_calcs: Vec<serde_json::Value>,
    pub income_calcs: Vec<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
pub struct DbStats {
    pub note_count: i64,
    pub todo_count: i64,
    pub customer_count: i64,
    pub contract_count: i64,
}
