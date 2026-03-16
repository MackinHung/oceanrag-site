# OceanRAG — 系統概念導覽

> 技術人員參考文件 · v0.4.4 · Beta

---

## 入門說明

### 1. 快速介紹

OceanRAG 是一套企業內部知識問答系統。員工用自然語言提問，系統從公司文件庫找答案，並附上來源出處。

核心訴求：
- 不需要懂語法或下關鍵字，直接問問題即可
- 回答附來源標記 [1][2]，點擊可查看原始段落
- 文件資料全程在企業自己的伺服器，不上傳雲端

技術定位：相較於傳統 RAG（單輪關鍵字搜尋），OceanRAG 支援多輪對話、意圖識別、查詢改寫、三層內容把關與向量重排序。

---

### 2. 功能特色

核心功能：

**智慧問答引擎**
自然語言查詢，支援多輪對話上下文。SSE 即時串流回答，Jina v5 1024-dim 向量檢索搭配 Groq LLM 生成。

**信心分數查核**
每個回答逐句驗證。使用 Erlangshen-Roberta-330M-NLI 模型，將回答拆成 claim 分別比對來源文件，標示 Entail / Neutral / Contradict，防止 AI 幻覺。

**文件清洗與入庫**
支援 PDF / DOCX / XLSX。8 階段自動化 pipeline：解析 → 清洗 → 切塊 → 摘要 → 向量化 → 品質檢測 → 入庫 → 通知。含 magic number 格式驗證與品質分數（滿分 100，60 分以下警示）。

**無關內容截斷（三層門控）**
- A-layer：意圖分類
- B-layer：向量 + 重排序雙重閾值（0.4v + 0.6r），找不到相關文件直接阻擋，不送 LLM
- C-layer：NLI 信心評分（PASS / WARN / BLOCK）
實測 30%～50% 無效查詢在 B-layer 就被攔截，節省算力成本。

**五層權限控制**
三種角色（master_admin / dept_admin / employee）× 五級機密等級（L1–L5）× 部門隔離，精確控制每位員工能查到什麼。

次要功能：
- 對話紀錄（session_id 追蹤，支援繼續先前對話）
- 用量統計儀表板（部門 → 使用者 → 查詢，三層 drill-down，CSV 匯出）
- AI 模型管理（可切換 generation / embedding / reranker / routing，熱切換不需重啟）
- 文件審閱工作流（管理員審核 → 品質檢查 → 上線，支援批量操作）
- 系統風險監控（風險分數 0–100，60 分警示 / 80 分嚴重警報）
- 來源追溯（citation 映射，PDF bounding box highlighting）

---

### 3. 核心效果

與傳統 RAG 相比：

| 比較面向 | 傳統 RAG | OceanRAG |
|---------|---------|---------|
| 搜尋方式 | 單輪關鍵字 | 多輪 + 意圖識別 + 查詢改寫 |
| 答案驗證 | 無 | NLI 逐句比對，信心有依據 |
| 幻覺防護 | 無 | 三層門控，信心不足直接阻擋 |
| 文件整理 | 人工 | 全自動 ETL + 品質分數 |
| 權限控制 | 全員可見 | 精確到文件等級的存取控制 |
| 部署依賴 | 需 5+ 外部服務 | SQLite + LanceDB，一鍵啟動 |
| 金鑰安全 | 多用 localStorage，有 XSS 風險 | httpOnly cookie + JWT RSA-2048 |
| 稽核日誌 | 可刪除 | SQLite trigger 保護，不可竄改 |

---

## 系統架構

### 1. 四層模組（零外部依賴）

```
T1 前端          HTML/JS，auth-guard.js 路由守衛（軟性防護）
T2 RAG 引擎      向量搜尋 + RBAC pre-filter + LLM 生成
T3 文件處理      8 階段 ETL pipeline，非同步佇列
T4 平台管理      認證、授權、用戶管理、稽核日誌、風險監控
```

各層獨立，T4 為主要後端（含 JWT 簽發），T2 透過 proxy 接收 cookie 後從 JWT payload 提取用戶身份，不持有私鑰。層間通訊使用 `X-Service-Token`，限流 30 req/min/IP。

資料庫：
- SQLite：用戶、文件 metadata、稽核日誌、Session、安全事件
- LanceDB：向量 chunks，RBAC pre-filter 在此層執行

---

### 2. 動態查詢

查詢流程（從使用者提問到回答輸出）：

```
用戶提問
  → A-layer 意圖分類（是否為知識庫查詢？）
  → 查詢改寫（多輪上下文理解）
  → B-layer 向量搜尋 + RBAC pre-filter（機密等級 + 部門 + 狀態）
  → 重排序（reranker，閾值 0.6）
  → 版本去重（同 document_group_id 保留最新年份）
  → LLM 生成（Groq，SSE 串流）
  → C-layer NLI 信心評分
  → 回答輸出（附來源 citation + 信心標示）
```

RBAC 過濾條件（向量搜尋前執行，不可繞過）：
```
clearance_level <= 使用者等級
AND doc_status = 'Active'
AND department = 使用者部門 OR 全公司
```

---

### 3. 雙 RAG 系統

OceanRAG 並非單一 RAG pipeline，而是兩套並存：

**標準模式**
一般查詢，B-layer 閾值把關後送 LLM，適合日常問答。

**深度分析模式**
消耗較多資源，需有功能權限才可使用（管理員可依機密等級開關）。適合需要跨文件綜合分析的場景。

兩種模式共用同一組 RBAC 過濾機制，安全邊界不因模式不同而改變。

---

## 管理課題

### 1. 資安議題

**資料不出境原則**
SQLite + LanceDB 全在本地。送到雲端 LLM（Groq）的只有改寫後的查詢摘要，不是原始文件全文。即使 API 被攔截，洩漏的也只是片段摘要。

**身份認證**
- JWT RS256 非對稱加密（簽發用私鑰、驗證用公鑰分離）
- httpOnly + SameSite=Strict cookie，Token 不暴露在前端 JS
- Refresh Token Rotation（每次刷新產生新 token）
- 時序攻擊防護（帳號不存在時執行 dummy bcrypt，回應時間一致）

**帳號保護**
- bcrypt 密碼雜湊（不可逆）
- 連續登入失敗後自動鎖定（預設 10 次後鎖 15 分鐘，可調整）
- 同時登入裝置上限（預設 3 台）
- 閒置逾時自動斷線（預設 30 分鐘）
- 角色或機密等級變更後立即撤銷所有 session

**不可竄改稽核日誌**
`audit_logs` 表有 SQLite DELETE 觸發器保護，資料只進不出。安全事件使用 SHA-256 雜湊鏈確保完整性，即使管理員也無法刪改已寫入記錄。

**檔案上傳防護**
Magic number 驗證（PDF 檢查 `%PDF`，DOCX/XLSX 檢查 `PK` header），不只看副檔名，防惡意檔案偽裝。

**前端防護**
`sanitize.js` 提供 `escapeHtml()` / `escapeHtmlAttr()` 防 XSS。Security Headers Middleware 設定 X-Content-Type-Options、X-Frame-Options、Referrer-Policy。

完整安全措施對照表：

| 威脅 | 措施 |
|------|------|
| XSS / Token 竊取 | httpOnly cookie，JS 無法存取 |
| CSRF | SameSite=Strict |
| 暴力破解 | 帳號鎖定 + IP 限流 |
| 時序攻擊 | dummy bcrypt |
| Session 固定 | 角色變更後撤銷所有 session |
| 路徑遍歷 | doc_id 格式驗證 + realpath 檢查 |
| SQL injection | 動態白名單欄位過濾 |
| 惡意檔案 | Magic number 驗證 |
| 機敏文件外洩 | RBAC pre-filter，不可繞過 |
| 內部威脅 | 不可竄改稽核日誌 + 風險評分 |

---

### 2. 消耗儀表板

**算力成本設計**
- 使用 Groq 推論，成本約 GPT-4 的 1/10～1/20
- B-layer 門控攔截 30%～50% 無效查詢，不送 LLM
- 文件向量化只在入庫時執行一次，查詢只做 query embedding

**用量追蹤**
三層 drill-down：部門 → 使用者 → 單次查詢。記錄 Token 消耗、成本、查詢次數，支援 Chart.js 圖表與 CSV 匯出。

**配額管理**
部門與個人均可設定查詢額度上限，超過即停止，防止單一部門耗盡預算。

**模型可切換**
管理員隨時切換模型供應商（generation / embedding / reranker / routing），熱切換不需重啟，不鎖定 vendor。

---

### 3. 雙日誌

系統維護兩套獨立日誌：

**查詢紀錄（conversation logs）**
記錄：時間、使用者、查詢內容、回答內容、信心度、模式、耗時。用途：服務品質改善、用量計費依據。

**安全稽核日誌（audit logs / security events）**
記錄：登入（時間/裝置/位置/成功失敗）、權限變更（before/after state）、文件操作（上傳/審核/下架）、管理操作。具 SHA-256 雜湊鏈，不可竄改，不可刪除。

兩套日誌均有存取權限控制：查詢紀錄僅限有稽核權限的管理員查看；安全事件管理員可「確認已讀」但無法修改內容。

---

## 開發計畫

### 1. 相容性

目前確認支援的模型類型：
- Generation：Groq（目前預設）、OpenAI 相容介面
- Embedding：Jina v5（1024-dim）
- Reranker：獨立模型，可抽換
- Routing / 意圖分類：獨立模型

管理員可透過 AI 模型管理介面新增 API Key、設定模型端點、即時健康檢查，不需重啟系統。

---

### 2. MCP 伺服器

（規劃中，詳細資訊待補充）

目標：讓 OceanRAG 的知識庫可作為 MCP（Model Context Protocol）工具源，供外部 agent 或 IDE 工具（如 Claude Code）直接呼叫。

---

### 3. API 與 Web

目前 T4 已提供完整 REST API，端點涵蓋：
- 認證：`/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`
- 用戶：`/api/user/profile`, `/api/user/sessions`, `/api/user/login-history`
- 文件：`/api/documents/{id}/markdown`, `/api/documents/{id}/preview`
- 管理：`/api/admin/users`, `/api/admin/departments`, `/api/admin/permissions`
- 查詢：`/api/query/*`（轉發至 T2）

（Web 對外介面規劃中，詳細資訊待補充）

---

### 4. Agent Teams

（規劃中，詳細資訊待補充）

構想：以 OceanRAG 知識庫為基底，支援多 agent 協作查詢，不同 agent 依角色持有不同機密等級憑證，RBAC 機制沿用現有設計。

---

## 部署升級

### 1. 本地伺服器部署

最小依賴設計：SQLite + LanceDB，無需 Redis / PostgreSQL / Elasticsearch。

啟動流程（概念）：
1. 設定環境變數（Service Token、JWT 金鑰對、模型 API Key）
2. 初始化資料庫（建立 master_admin 帳號）
3. 啟動四個 Tier（T1 靜態檔案 + T2 RAG + T3 文件處理 + T4 平台管理）
4. 可選：設定內網/VPN IP 白名單（CIDR 格式）

生產環境注意事項：
- 禁止使用預設 Service Token
- JWT 私鑰須妥善保管，T2 只持有公鑰
- 建議設定 HTTPS（Security Headers Middleware 已內建）

---

### 2. 私有雲部署

架構上四個 Tier 可分開部署於不同容器/節點，層間以 `X-Service-Token` 認證通訊。

重點考量：
- T1（前端）與 T4（後端）需同源，以避免 CORS 問題（透過 proxy 實現）
- T2 不直接暴露於外網，僅接受 T4 proxy 轉發的請求
- LanceDB 與 SQLite 的資料目錄建議掛載持久化 volume

（容器化配置細節待補充）

---

### 3. 資料庫與架構更換（分支）

目前資料層：
- **SQLite**：關聯式資料（用戶、文件 metadata、稽核日誌）
- **LanceDB**：向量資料（document chunks + embedding）

潛在替換方向：
- SQLite → PostgreSQL：適合多節點高並發場景，需調整 DAL 層與 trigger 機制
- LanceDB → Weaviate / Qdrant：適合更大規模向量資料，需調整 `lancedb_dal.py` 的過濾語法

注意：RBAC pre-filter 邏輯（機密等級 + 部門 + 狀態）與底層 DAL 緊密結合，替換時需確保 `RBACFilter.build_filters()` 的輸出能被新向量庫正確解析。

---

*本文件為系統概念導覽，適合技術評估與架構理解使用。程式碼層級細節請參考 AUTHORIZATION_MODEL_TECH.md。*
