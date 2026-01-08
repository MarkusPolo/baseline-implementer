## **1\) Objectives and non-functional requirements**

### **Primary objectives**

* **Template authoring**: Users create reusable command templates with variables and optional blocks.  
* **Job execution**: Apply a template to **one or many ports** concurrently, each with its own variable set.  
* **Verification**: After config, run command(s) (e.g., `show run`) and verify via **regex/structured checks**.  
* **Observability**: Provide job status in real time, plus detailed logs: what was sent, what was received, and where it failed.  
* **Safety**: Strong input validation, concurrency controls, and prevention of port contention.

### **Non-functional**

* Secure by design (authn/authz; least privilege for serial access).  
* Robust serial handling (timeouts, prompt changes, paging, banners).  
* Maintainable (clear separation: web UI ↔ API ↔ worker ↔ serial engine).  
* Good UX (guided template creation, variable forms, per-port status).

---

## **2\) High-level architecture**

### **Components**

1. **Frontend Web App**  
   * A modern UI with:  
     * Template builder (wizard \+ advanced editor)  
     * Variable form generation (auto from template schema)  
     * Multi-device “Run” page with 16-port grid  
     * Live progress view (streamed logs and step statuses)  
2. **Backend API**  
   * CRUD for templates and “device profiles”  
   * Create/monitor jobs  
   * Return structured execution results  
   * Serve authentication and audit trails  
3. **Worker / Job Runner**  
   * Asynchronous execution of jobs  
   * Concurrency: run N ports in parallel (configurable)  
   * Each device execution is an isolated task  
4. **Serial Execution Engine**  
   * Opens `~/portX` symlink (or `/dev/ttyUSB*`) exclusively  
   * Prompt detection, state transitions, retries  
   * Command dispatch, capture outputs  
   * Verification passes (regex/expectations)  
5. **Database \+ Storage**  
   * Templates, job records, logs, user accounts  
   * Store logs in DB initially; optionally ship to filesystem/S3 later

### **Suggested tech choices (practical for Ubuntu server)**

* Backend: **Python FastAPI**  
* Worker: **Celery \+ Redis** (or RQ/Arq; Celery is mature)  
* Serial: **pyserial** \+ your prompt/expect logic  
* Frontend: **Next.js \+ React** (or Vue) with component library  
* Styling/components: **Tailwind \+ shadcn/ui** (fast to get “nice looking”)  
* DB: **PostgreSQL** (SQLite acceptable for MVP)  
* Real-time updates: **WebSockets** (FastAPI) or SSE

---

## **3\) Data model (MVP)**

### **Template**

* `id`, `name`, `description`, `vendor_profile` (optional)  
* `body` (the actual template text)  
* `schema` (JSON describing variables, types, validation constraints)  
* `verification` (list of checks to run post-config)  
* `created_by`, `created_at`, `updated_at`

### **Job**

* `id`, `template_id`, `created_by`, `created_at`  
* `status`: queued/running/partial\_success/success/failed/cancelled  
* `options`: concurrency, timeouts, baud rates, etc.

### **JobTarget (one per device/port)**

* `job_id`, `port_number` (1..16), `port_path`  
* `variables` JSON (filled by user)  
* `status`: queued/running/success/failed  
* `started_at`, `ended_at`  
* `result_summary` JSON (high-level)  
* `raw_log` (optional large text)  
* `steps` JSON (structured step log)

---

## **4\) Template format and user experience**

You want “easy” template creation but still powerful. Best pattern:

### **Two modes**

1. **Simple Mode (Wizard)**  
   * User selects a baseline type (e.g., “Cisco-like L2 switch baseline”)  
   * UI exposes a limited set of toggles/fields:  
     * Hostname  
     * Mgmt VLAN enabled? If yes: VLAN ID; if no: use VLAN1  
     * Mgmt IP/mask  
     * Gateway  
     * SSH enable  
     * Local user login  
     * RSA modulus  
   * The UI generates a valid underlying template (Jinja2-like) and schema  
2. **Advanced Mode (Editor)**  
   * Full template text editor (syntax highlight)  
   * Schema editor (form builder) with previews  
   * Verification editor (define checks)

### **Template engine**

Use **Jinja2** (fits your example) with strict undefined variables:

* `undefined=StrictUndefined` so missing inputs fail early  
* Add custom filters for common tasks (e.g., `cidr_to_mask`, `ip_in_subnet`)

### **Template schema (important)**

Instead of “parse variables from template text” (fragile), store a **schema** alongside templates:

Example schema for your sample:

{  
  "fields": \[  
    {"name":"hostname","type":"string","required":true,"pattern":"^\[a-zA-Z0-9-\]{1,32}$"},  
    {"name":"mgmt\_vlan","type":"integer","required":false,"min":1,"max":4094},  
    {"name":"mgmt\_ip","type":"ipv4","required":true},  
    {"name":"mgmt\_mask","type":"ipv4","required":true},  
    {"name":"gateway","type":"ipv4","required":true}  
  \]  
}

UI renders validated forms from schema automatically.

---

## **5\) Execution model**

### **Job submission flow**

* User chooses Template  
* UI shows a **16-port grid**  
  * Each port can be enabled/disabled  
  * For each enabled port: provide variable set (hostname/ip/etc.)  
  * Option to import a CSV (port, hostname, ip, mask, gateway, …)  
* Submit → Backend creates Job \+ JobTargets  
* Worker begins processing targets with bounded concurrency

### **Per-port execution steps (structured)**

For each target:

1. Acquire **port lock** (to prevent two jobs on same serial)  
2. Open serial with configured baud (try 9600 then 115200 if desired)  
3. Wake/prompt detect  
4. Ensure privilege mode  
5. Execute rendered command list  
6. Run verification commands (e.g., `show run`)  
7. Evaluate checks  
8. If configured, write memory  
9. Release lock, finalize result

### **Concurrency and safety**

* Configure `max_parallel_targets` (e.g., 4 at a time)  
* Lock per port using:  
  * Redis lock keyed by `portN`, or  
  * file lock on the device path (fcntl), or both

---

## **6\) Verification design (what “detailed verification” means)**

Users should see both:

* **Command execution correctness** (prompt returned, no error text)  
* **Config correctness** (desired state present)

### **Recommended verification structure**

Each template includes a list of checks, for example:

* `show run` must match:  
  * `(?m)^hostname sw-test-07$`  
  * `(?m)^ip default-gateway <gateway>$`  
  * `(?m)^interface Vlan(\d+|1)$` and contains the IP line  
* Additionally scan output for common failure markers:  
  * `% Invalid input detected`  
  * `% Incomplete command`  
  * `Ambiguous command`  
  * `Error:`

Return a **check report**:

* Check name  
* Command used  
* Regex/predicate  
* Pass/fail  
* Evidence snippet (small excerpt around match/failure)

### **Capturing evidence without overwhelming UI**

* Store full raw output in backend  
* UI shows:  
  * Collapsible logs  
  * For failures: show 10–20 lines around the relevant point

---

## **7\) Error handling and “what went wrong”**

Classify failures consistently:

### **Failure categories**

* Port busy / lock not acquired  
* Permission denied on serial device  
* No prompt (cabling/baud/wrong port)  
* Enable password required  
* Command timeouts  
* Device returned error markers  
* Verification failed (state mismatch)  
* Unexpected disconnect

### **What to provide to the user**

For each port target:

* A timeline of steps with status icons  
* On failure:  
  * Step where it failed  
  * Last prompt seen  
  * Last N lines of serial output  
  * Recommended next action (deterministic guidance)

---

## **8\) Frontend UX: “really nice looking”**

### **Key screens**

1. **Dashboard**  
   * Recent jobs with success rate  
   * “Create new job” CTA  
2. **Template Library**  
   * Cards/list of templates  
   * “Create template” (Simple/Advanced)  
   * Template validation preview  
3. **Template Builder (Simple)**  
   * Form-based baseline builder  
   * Live preview of resulting config  
   * Define which fields appear on execution forms  
4. **Run Job**  
   * Left: template selection and global settings (baud, retries, concurrency)  
   * Main: 16-port grid  
     * Toggle port active  
     * Per-port form (auto-generated)  
   * Import/Export CSV  
   * “Dry run” mode (render only, no serial)  
5. **Job Detail**  
   * Live progress per port (WebSocket updates)  
   * Per-port tabs:  
     * Summary  
     * Steps \+ logs  
     * Verification report  
     * Raw transcript download

### **Input validation**

* Client-side validation from schema (fast feedback)  
* Server-side validation again (authoritative)  
* IP fields: dedicated IPv4 input  
* VLAN ID: numeric constraints  
* Hostname: pattern \+ length

---

## **9\) Security and operational considerations**

* Run backend under a service account in `dialout` group.  
* Strictly limit accessible serial paths to `~/port1..16` (whitelist).  
* Authentication:  
  * MVP: local username/password  
  * Later: SSO/OIDC  
* Audit logs: who ran what template against which ports  
* Secrets:  
  * If enable passwords or local-user credentials are needed, store encrypted  
  * Consider per-template “credential references” instead of embedding

---

## **10\) Phased delivery plan (practical milestones)**

### **Phase 0 — Hardening the serial engine (1–2 iterations)**

* Extract your current script into a reusable library:  
  * `SerialSession`  
  * `CommandRunner`  
  * `PromptDetector`  
  * `Verifier`  
* Unit-test prompt parsing and regex checks with recorded transcripts

### **Phase 1 — MVP Web App (single server)**

* Templates CRUD (name/body/schema)  
* Job creation for multiple ports  
* Worker executes and streams status  
* Basic verification with regex  
* UI pages: Templates, Run Job, Job Detail

### **Phase 2 — Template wizard \+ CSV import**

* “Simple mode” template builder  
* CSV import/export for port variable sets  
* Job result export (JSON/CSV)

### **Phase 3 — Advanced verification and diagnostics**

* Rich verification DSL (named checks, evidence snippets)  
* Failure categorization and remediation suggestions  
* Device “facts” collection (model, version) for better baselines

### **Phase 4 — Multi-vendor and profiles**

* Device profiles: Cisco IOS, IOS-XE, etc.  
* Per-profile prompt patterns and error markers  
* Optional pre-flight checks: detect vendor/version before applying

---

## **11\) Concrete “MVP contract” (what you implement first)**

### **Backend endpoints (example)**

* `POST /templates`, `GET /templates`, `GET /templates/{id}`, `PUT /templates/{id}`  
* `POST /jobs` (template\_id \+ targets\[{port, variables}\] \+ options)  
* `GET /jobs/{id}` (summary)  
* `GET /jobs/{id}/targets/{port}` (details, logs)  
* `WS /jobs/{id}/stream` (live updates)

### **Worker payload**

* Render template using variables  
* Split into commands safely:  
  * either line-by-line commands  
  * or explicit list structure in schema  
* Execute with timeouts  
* Capture transcript  
* Run verification checks  
* Persist results

---

## **12\) Recommendations to simplify the template experience**

Your current Jinja2 snippet is powerful but potentially intimidating. For “easy templates,” implement:

* **Pre-built “building blocks”** (cards):  
  * “Set hostname”  
  * “Configure management SVI”  
  * “Set default gateway”  
  * “Enable SSH”  
  * “Generate RSA keys”  
* The template builder composes these blocks into a valid template and schema.  
* Advanced users can still edit the raw template.

This keeps 90% of users out of Jinja syntax while preserving flexibility.

