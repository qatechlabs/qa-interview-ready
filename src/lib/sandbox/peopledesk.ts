/**
 * PeopleDesk HR API: an OrangeHRM-style HR system with admin and employee (ESS) accounts,
 * employee records (PIM), leave requests with approvals and balances, and attendance.
 */
import { type AppApi, ApiError, bad, bearer, conflict, forbidden, notFound, nowIso, paginate, require as need, route, str, unauthorized } from "./http";
import { createHmac } from "node:crypto";

export interface Employee {
  id: string;
  first: string;
  middle: string;
  last: string;
  job: string;
  status: string;
  sub: string;
  email: string;
  phone: string;
  location: string;
  joined: string;
  managerId: string | null;
}

export const SEED: Employee[] = [
  { id: "0001", first: "Priya", middle: "", last: "Sharma", job: "QA Engineer", status: "Full-Time Permanent", sub: "Quality Engineering", email: "priya.sharma@peopledesk.test", phone: "+91 98100 11001", location: "Hyderabad", joined: "2021-03-15", managerId: "0006" },
  { id: "0002", first: "Rahul", middle: "K", last: "Verma", job: "SDET", status: "Full-Time Permanent", sub: "Quality Engineering", email: "rahul.verma@peopledesk.test", phone: "+91 98100 11002", location: "Bengaluru", joined: "2020-07-01", managerId: "0006" },
  { id: "0003", first: "Ananya", middle: "", last: "Iyer", job: "Product Manager", status: "Full-Time Contract", sub: "Product", email: "ananya.iyer@peopledesk.test", phone: "+91 98100 11003", location: "Chennai", joined: "2022-01-10", managerId: null },
  { id: "0004", first: "Vikram", middle: "", last: "Singh", job: "DevOps Engineer", status: "Full-Time Permanent", sub: "Platform", email: "vikram.singh@peopledesk.test", phone: "+91 98100 11004", location: "Pune", joined: "2019-11-20", managerId: "0009" },
  { id: "0005", first: "Sneha", middle: "R", last: "Patel", job: "HR Executive", status: "Part-Time", sub: "Human Resources", email: "sneha.patel@peopledesk.test", phone: "+91 98100 11005", location: "Hyderabad", joined: "2023-05-02", managerId: null },
  { id: "0006", first: "Arjun", middle: "", last: "Nair", job: "Test Lead", status: "Full-Time Permanent", sub: "Quality Engineering", email: "arjun.nair@peopledesk.test", phone: "+91 98100 11006", location: "Hyderabad", joined: "2018-02-12", managerId: null },
  { id: "0007", first: "Meera", middle: "", last: "Krishnan", job: "Developer", status: "Full-Time Permanent", sub: "Engineering", email: "meera.krishnan@peopledesk.test", phone: "+91 98100 11007", location: "Bengaluru", joined: "2021-09-06", managerId: "0009" },
  { id: "0008", first: "Karan", middle: "S", last: "Mehta", job: "Developer", status: "Full-Time Probation", sub: "Engineering", email: "karan.mehta@peopledesk.test", phone: "+91 98100 11008", location: "Mumbai", joined: "2026-08-18", managerId: "0009" },
  { id: "0009", first: "Divya", middle: "", last: "Reddy", job: "Engineering Manager", status: "Full-Time Permanent", sub: "Engineering", email: "divya.reddy@peopledesk.test", phone: "+91 98100 11009", location: "Hyderabad", joined: "2017-06-01", managerId: null },
  { id: "0010", first: "Sanjay", middle: "", last: "Gupta", job: "QA Engineer", status: "Full-Time Contract", sub: "Quality Engineering", email: "sanjay.gupta@peopledesk.test", phone: "+91 98100 11010", location: "Noida", joined: "2024-02-26", managerId: "0006" },
  { id: "0011", first: "Fatima", middle: "", last: "Khan", job: "Business Analyst", status: "Full-Time Permanent", sub: "Product", email: "fatima.khan@peopledesk.test", phone: "+91 98100 11011", location: "Chennai", joined: "2022-10-03", managerId: "0003" },
  { id: "0012", first: "Rohan", middle: "", last: "Das", job: "SDET", status: "Full-Time Permanent", sub: "Quality Engineering", email: "rohan.das@peopledesk.test", phone: "+91 98100 11012", location: "Kolkata", joined: "2023-01-16", managerId: "0006" },
  { id: "0013", first: "Lakshmi", middle: "V", last: "Menon", job: "HR Manager", status: "Full-Time Permanent", sub: "Human Resources", email: "lakshmi.menon@peopledesk.test", phone: "+91 98100 11013", location: "Hyderabad", joined: "2016-04-11", managerId: null },
  { id: "0014", first: "Aditya", middle: "", last: "Bose", job: "Intern", status: "Internship", sub: "Engineering", email: "aditya.bose@peopledesk.test", phone: "+91 98100 11014", location: "Bengaluru", joined: "2026-06-01", managerId: "0007" },
];
export const SEED_COUNT = SEED.length;
export const JOB_TITLES = ["QA Engineer", "SDET", "Test Lead", "Developer", "DevOps Engineer", "Product Manager", "Business Analyst", "HR Executive", "HR Manager", "Engineering Manager", "Intern"];
export const EMPLOYMENT_STATUS = ["Full-Time Permanent", "Full-Time Contract", "Full-Time Probation", "Part-Time", "Internship"];
export const DEPARTMENTS = ["Quality Engineering", "Engineering", "Platform", "Product", "Human Resources"];
export const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Earned Leave"];
export const ENTITLEMENT: Record<string, number> = { "Casual Leave": 12, "Sick Leave": 10, "Earned Leave": 15 };
export const LEAVE_STATUS = ["Pending Approval", "Scheduled", "Taken", "Rejected", "Cancelled"];
const ESS_PASSWORD = "Welcome@1";

export interface Leave {
  id: number;
  employeeId: string;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  comment: string;
  status: string;
  appliedAt: string;
  decidedBy?: string;
  decisionComment?: string;
}
export interface Punch {
  id: number;
  employeeId: string;
  in: string;
  out: string | null;
  note: string;
}
export interface Auth {
  username: string;
  role: "admin" | "ess";
  employeeId: string | null;
  name: string;
}
export interface HrState {
  auth: Auth | null;
  added: Employee[];
  edits: Record<string, Partial<Employee>>;
  deleted: string[];
  leaves: Leave[];
  punches: Punch[];
  seq: number;
}
const initial = (): HrState => ({ auth: null, added: [], edits: {}, deleted: [], leaves: [], punches: [], seq: 1 });

export const fullName = (e: Pick<Employee, "first" | "middle" | "last">) => [e.first, e.middle, e.last].filter(Boolean).join(" ");
export const essUsername = (e: Employee) => `${e.first}.${e.last}`.toLowerCase();

export function allEmployees(s: HrState): Employee[] {
  return [...SEED, ...s.added].filter((e) => !s.deleted.includes(e.id)).map((e) => ({ ...e, ...(s.edits[e.id] || {}) }));
}
const findEmployee = (s: HrState, id: string) => allEmployees(s).find((e) => e.id === id);

const tokenFor = (username: string) => `pd.${username}.${createHmac("sha256", process.env.ACCESS_TOKEN_SECRET || "sandbox-dev-secret-change-me").update(`pd:${username}`).digest("base64url").slice(0, 16)}`;

function authOf(c: { state: HrState; headers: Headers }): Auth {
  const t = bearer(c.headers);
  if (t) {
    const m = /^pd\.([a-z0-9.]+)\.(.+)$/i.exec(t);
    if (!m || tokenFor(m[1]) !== t) throw unauthorized("Invalid bearer token");
    if (m[1] === "admin") return { username: "Admin", role: "admin", employeeId: null, name: "Admin" };
    const e = allEmployees(c.state).find((x) => essUsername(x) === m[1]);
    if (!e) throw unauthorized("Invalid bearer token");
    return { username: m[1], role: "ess", employeeId: e.id, name: fullName(e) };
  }
  if (!c.state.auth) throw unauthorized("Log in first: POST /auth/login");
  return c.state.auth;
}
const adminOnly = (a: Auth) => {
  if (a.role !== "admin") throw forbidden("Only an Admin can do that");
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const daysBetween = (from: string, to: string) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;

export function balances(s: HrState, employeeId: string) {
  return LEAVE_TYPES.map((type) => {
    const used = s.leaves.filter((l) => l.employeeId === employeeId && l.type === type && (l.status === "Scheduled" || l.status === "Taken")).reduce((a, l) => a + l.days, 0);
    const pending = s.leaves.filter((l) => l.employeeId === employeeId && l.type === type && l.status === "Pending Approval").reduce((a, l) => a + l.days, 0);
    return { type, entitlement: ENTITLEMENT[type], used, pending, available: ENTITLEMENT[type] - used - pending };
  });
}

export const peopledeskApi: AppApi<HrState> = {
  id: "peopledesk",
  initial,
  routes: [
    route("GET", "/", () => ({
      name: "PeopleDesk HR API",
      version: "1.0",
      auth: "POST /auth/login (Admin / admin123, or an employee: first.last / Welcome@1) sets a session cookie and returns a bearer token.",
      endpoints: [
        "POST /auth/login {username, password}",
        "POST /auth/logout",
        "GET /me",
        "GET /meta",
        "GET /dashboard",
        "GET /employees?name=&id=&job=&status=&department=&page=&limit=",
        "POST /employees {firstName, lastName, middleName?, employeeId?, jobTitle?, employmentStatus?, department?, email?, phone?, location?}",
        "GET /employees/:id",
        "PATCH /employees/:id {any of the fields}",
        "DELETE /employees/:id",
        "GET /leave?status=&employeeId=",
        "POST /leave {leaveType, fromDate, toDate, comment?, employeeId? (admin)}",
        "GET /leave/balance?employeeId=",
        "POST /leave/:id/cancel",
        "POST /leave/:id/approve {comment?}",
        "POST /leave/:id/reject {comment?}",
        "GET /attendance?employeeId=",
        "POST /attendance/punch {type: in|out, note?}",
        "POST /reset",
      ],
    })),
    route("POST", "/auth/login", (c) => {
      const { username, password } = need(c.body, ["username", "password"]);
      if (username === "Admin" && password === "admin123") {
        c.state.auth = { username: "Admin", role: "admin", employeeId: null, name: "Admin" };
        c.touch();
        return { user: c.state.auth, token: tokenFor("admin") };
      }
      const e = allEmployees(c.state).find((x) => essUsername(x) === username.toLowerCase());
      if (e && password === ESS_PASSWORD) {
        c.state.auth = { username: essUsername(e), role: "ess", employeeId: e.id, name: fullName(e) };
        c.touch();
        return { user: c.state.auth, token: tokenFor(essUsername(e)) };
      }
      throw new ApiError(401, "invalid_credentials", "Invalid credentials");
    }),
    route("POST", "/auth/logout", (c) => {
      c.state.auth = null;
      c.touch();
      return { ok: true };
    }),
    route("GET", "/me", (c) => {
      const a = authOf(c);
      return { user: a, employee: a.employeeId ? findEmployee(c.state, a.employeeId) : null };
    }),
    route("GET", "/meta", () => ({ jobTitles: JOB_TITLES, employmentStatus: EMPLOYMENT_STATUS, departments: DEPARTMENTS, leaveTypes: LEAVE_TYPES, leaveStatus: LEAVE_STATUS, entitlement: ENTITLEMENT })),
    route("GET", "/dashboard", (c) => {
      const a = authOf(c);
      const emps = allEmployees(c.state);
      const today = nowIso().slice(0, 10);
      const mine = a.role === "admin" ? c.state.leaves : c.state.leaves.filter((l) => l.employeeId === a.employeeId);
      return {
        employees: emps.length,
        byDepartment: DEPARTMENTS.map((d) => ({ department: d, count: emps.filter((e) => e.sub === d).length })),
        leavesPending: mine.filter((l) => l.status === "Pending Approval").length,
        onLeaveToday: c.state.leaves.filter((l) => l.status === "Scheduled" && l.from <= today && l.to >= today).map((l) => l.employee),
        punchedIn: c.state.punches.filter((p) => !p.out).length,
      };
    }),
    route("GET", "/employees", (c) => {
      authOf(c);
      const name = (c.query.get("name") || "").toLowerCase();
      const id = c.query.get("id") || "";
      const job = c.query.get("job") || "";
      const status = c.query.get("status") || "";
      const dept = c.query.get("department") || "";
      const list = allEmployees(c.state).filter((e) => (!name || fullName(e).toLowerCase().includes(name)) && (!id || e.id === id) && (!job || e.job === job) && (!status || e.status === status) && (!dept || e.sub === dept));
      return paginate(list, c.query, 50, 100);
    }),
    route("POST", "/employees", (c) => {
      adminOnly(authOf(c));
      const b = c.body;
      const first = str(b.firstName ?? b.first);
      const last = str(b.lastName ?? b.last);
      const errors: Record<string, string> = {};
      if (!first) errors.firstName = "Required";
      if (!last) errors.lastName = "Required";
      const all = allEmployees(c.state);
      const max = [...SEED, ...c.state.added].reduce((m, e) => Math.max(m, parseInt(e.id, 10) || 0), 0);
      const id = str(b.employeeId ?? b.id) || String(max + 1).padStart(4, "0");
      if (all.some((e) => e.id === id)) errors.employeeId = "Employee Id already exists";
      const job = str(b.jobTitle ?? b.job);
      if (job && !JOB_TITLES.includes(job)) errors.jobTitle = `Must be one of: ${JOB_TITLES.join(", ")}`;
      const status = str(b.employmentStatus ?? b.status) || "Full-Time Probation";
      if (!EMPLOYMENT_STATUS.includes(status)) errors.employmentStatus = `Must be one of: ${EMPLOYMENT_STATUS.join(", ")}`;
      const sub = str(b.department ?? b.sub);
      if (sub && !DEPARTMENTS.includes(sub)) errors.department = `Must be one of: ${DEPARTMENTS.join(", ")}`;
      const email = str(b.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email";
      if (Object.keys(errors).length) throw bad("Validation failed", errors);
      const emp: Employee = { id, first, middle: str(b.middleName ?? b.middle), last, job, status, sub, email: email || `${first}.${last}`.toLowerCase() + "@peopledesk.test", phone: str(b.phone), location: str(b.location), joined: str(b.joined) || nowIso().slice(0, 10), managerId: str(b.managerId) || null };
      c.state.added.push(emp);
      c.touch();
      c.status = 201;
      return { employee: emp };
    }),
    route("GET", "/employees/:id", (c, p) => {
      const a = authOf(c);
      const e = findEmployee(c.state, p.id);
      if (!e) throw notFound(`Employee ${p.id}`);
      const manager = e.managerId ? findEmployee(c.state, e.managerId) : null;
      return { employee: e, manager: manager ? { id: manager.id, name: fullName(manager) } : null, reports: allEmployees(c.state).filter((x) => x.managerId === e.id).map((x) => ({ id: x.id, name: fullName(x) })), canEdit: a.role === "admin" || a.employeeId === e.id };
    }),
    route("PATCH", "/employees/:id", (c, p) => {
      const a = authOf(c);
      const e = findEmployee(c.state, p.id);
      if (!e) throw notFound(`Employee ${p.id}`);
      if (a.role !== "admin" && a.employeeId !== e.id) throw forbidden("You can only edit your own record");
      const b = c.body;
      const patch: Partial<Employee> = {};
      const map: [string[], keyof Employee][] = [[["firstName", "first"], "first"], [["middleName", "middle"], "middle"], [["lastName", "last"], "last"], [["jobTitle", "job"], "job"], [["employmentStatus", "status"], "status"], [["department", "sub"], "sub"], [["email"], "email"], [["phone"], "phone"], [["location"], "location"], [["joined"], "joined"]];
      for (const [keys, field] of map) for (const k of keys) if (b[k] !== undefined) (patch as Record<string, unknown>)[field] = str(b[k]);
      if (a.role !== "admin") for (const k of ["job", "status", "sub", "joined"] as const) if (patch[k] !== undefined) throw forbidden(`Only an Admin can change ${k === "sub" ? "department" : k === "job" ? "job title" : k === "status" ? "employment status" : "joining date"}`);
      if (patch.first === "") throw bad("First name cannot be empty");
      if (patch.last === "") throw bad("Last name cannot be empty");
      if (patch.job && !JOB_TITLES.includes(patch.job)) throw bad(`jobTitle must be one of: ${JOB_TITLES.join(", ")}`);
      if (patch.status && !EMPLOYMENT_STATUS.includes(patch.status)) throw bad(`employmentStatus must be one of: ${EMPLOYMENT_STATUS.join(", ")}`);
      if (patch.sub && !DEPARTMENTS.includes(patch.sub)) throw bad(`department must be one of: ${DEPARTMENTS.join(", ")}`);
      if (!Object.keys(patch).length) throw bad("Nothing to update");
      c.state.edits[e.id] = { ...(c.state.edits[e.id] || {}), ...patch };
      c.touch();
      return { employee: findEmployee(c.state, e.id) };
    }),
    route("DELETE", "/employees/:id", (c, p) => {
      adminOnly(authOf(c));
      const e = findEmployee(c.state, p.id);
      if (!e) throw notFound(`Employee ${p.id}`);
      c.state.deleted.push(e.id);
      c.touch();
      return { ok: true, deleted: e.id };
    }),
    route("GET", "/leave", (c) => {
      const a = authOf(c);
      const status = c.query.get("status") || "";
      const emp = a.role === "admin" ? c.query.get("employeeId") || "" : a.employeeId!;
      const list = c.state.leaves.filter((l) => (!status || l.status === status) && (!emp || l.employeeId === emp));
      return { items: list, total: list.length };
    }),
    route("GET", "/leave/balance", (c) => {
      const a = authOf(c);
      const emp = a.role === "admin" ? c.query.get("employeeId") || "" : a.employeeId!;
      if (!emp) throw bad("employeeId is required for an Admin");
      if (!findEmployee(c.state, emp)) throw notFound(`Employee ${emp}`);
      return { employeeId: emp, balances: balances(c.state, emp) };
    }),
    route("POST", "/leave", (c) => {
      const a = authOf(c);
      const b = c.body;
      const type = str(b.leaveType ?? b.type);
      const from = str(b.fromDate ?? b.from);
      const to = str(b.toDate ?? b.to);
      const errors: Record<string, string> = {};
      if (!type) errors.leaveType = "Required";
      else if (!LEAVE_TYPES.includes(type)) errors.leaveType = `Must be one of: ${LEAVE_TYPES.join(", ")}`;
      if (!from) errors.fromDate = "Required";
      else if (!DATE.test(from)) errors.fromDate = "Use YYYY-MM-DD";
      if (!to) errors.toDate = "Required";
      else if (!DATE.test(to)) errors.toDate = "Use YYYY-MM-DD";
      else if (from && to < from) errors.toDate = "To date should be after from date";
      if (Object.keys(errors).length) throw bad("Validation failed", errors);
      let employeeId = a.employeeId;
      if (a.role === "admin") {
        employeeId = str(b.employeeId) || "0001";
      }
      const emp = findEmployee(c.state, employeeId!);
      if (!emp) throw notFound(`Employee ${employeeId}`);
      const days = daysBetween(from, to);
      if (days > 30) throw bad("A single request cannot exceed 30 days");
      const overlap = c.state.leaves.find((l) => l.employeeId === emp.id && l.status !== "Cancelled" && l.status !== "Rejected" && l.from <= to && l.to >= from);
      if (overlap) throw conflict(`Overlaps an existing ${overlap.status.toLowerCase()} request (${overlap.from} to ${overlap.to})`);
      const bal = balances(c.state, emp.id).find((x) => x.type === type)!;
      if (days > bal.available) throw new ApiError(400, "insufficient_balance", `Balance exceeded: ${bal.available} day(s) of ${type} available`, { available: bal.available, requested: days });
      const leave: Leave = { id: c.state.seq++, employeeId: emp.id, employee: fullName(emp), type, from, to, days, comment: str(b.comment), status: "Pending Approval", appliedAt: nowIso() };
      c.state.leaves.push(leave);
      c.touch();
      c.status = 201;
      return { leave };
    }),
    route("POST", "/leave/:id/cancel", (c, p) => {
      const a = authOf(c);
      const l = c.state.leaves.find((x) => String(x.id) === p.id);
      if (!l) throw notFound(`Leave request ${p.id}`);
      if (a.role !== "admin" && l.employeeId !== a.employeeId) throw forbidden("You can only cancel your own requests");
      if (l.status !== "Pending Approval" && l.status !== "Scheduled") throw conflict(`Cannot cancel a request that is ${l.status}`);
      l.status = "Cancelled";
      c.touch();
      return { leave: l };
    }),
    route("POST", "/leave/:id/approve", (c, p) => {
      const a = authOf(c);
      adminOnly(a);
      const l = c.state.leaves.find((x) => String(x.id) === p.id);
      if (!l) throw notFound(`Leave request ${p.id}`);
      if (l.status !== "Pending Approval") throw conflict(`Only pending requests can be approved (this one is ${l.status})`);
      l.status = "Scheduled";
      l.decidedBy = a.username;
      l.decisionComment = str(c.body.comment);
      c.touch();
      return { leave: l };
    }),
    route("POST", "/leave/:id/reject", (c, p) => {
      const a = authOf(c);
      adminOnly(a);
      const l = c.state.leaves.find((x) => String(x.id) === p.id);
      if (!l) throw notFound(`Leave request ${p.id}`);
      if (l.status !== "Pending Approval") throw conflict(`Only pending requests can be rejected (this one is ${l.status})`);
      l.status = "Rejected";
      l.decidedBy = a.username;
      l.decisionComment = str(c.body.comment);
      c.touch();
      return { leave: l };
    }),
    route("GET", "/attendance", (c) => {
      const a = authOf(c);
      const emp = a.role === "admin" ? c.query.get("employeeId") || "" : a.employeeId!;
      const items = c.state.punches.filter((x) => !emp || x.employeeId === emp);
      return { items, open: items.find((x) => !x.out) ?? null };
    }),
    route("POST", "/attendance/punch", (c) => {
      const a = authOf(c);
      const type = str(c.body.type);
      if (type !== "in" && type !== "out") throw bad("type must be 'in' or 'out'");
      const employeeId = a.role === "admin" ? str(c.body.employeeId) || "0001" : a.employeeId!;
      const open = c.state.punches.find((x) => x.employeeId === employeeId && !x.out);
      if (type === "in") {
        if (open) throw conflict("Already punched in; punch out first");
        const punch: Punch = { id: c.state.seq++, employeeId, in: nowIso(), out: null, note: str(c.body.note) };
        c.state.punches.push(punch);
        c.state.punches = c.state.punches.slice(-20);
        c.touch();
        c.status = 201;
        return { punch };
      }
      if (!open) throw conflict("Not punched in");
      open.out = nowIso();
      if (str(c.body.note)) open.note = str(c.body.note);
      c.touch();
      return { punch: open, hours: Math.round(((new Date(open.out).getTime() - new Date(open.in).getTime()) / 3600000) * 100) / 100 };
    }),
    route("POST", "/reset", (c) => {
      c.replace(initial());
      return { ok: true };
    }),
  ],
};
