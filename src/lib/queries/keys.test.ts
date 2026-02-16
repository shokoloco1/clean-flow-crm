import { describe, it, expect } from "vitest";
import { queryKeys } from "./keys";

describe("queryKeys", () => {
  describe("jobs", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.jobs.all()).toEqual(["jobs"]);
    });

    it("today() returns correct key", () => {
      expect(queryKeys.jobs.today()).toEqual(["jobs", "today"]);
    });

    it("byId() includes the id", () => {
      expect(queryKeys.jobs.byId("abc-123")).toEqual(["jobs", "abc-123"]);
    });

    it("byDate() includes the date", () => {
      expect(queryKeys.jobs.byDate("2024-01-15")).toEqual(["jobs", "date", "2024-01-15"]);
    });
  });

  describe("clients", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.clients.all()).toEqual(["clients"]);
    });

    it("list() embeds params for cache granularity", () => {
      expect(queryKeys.clients.list({ page: 2, search: "test" })).toEqual([
        "clients",
        "list",
        { page: 2, search: "test" },
      ]);
    });

    it("byId() includes the id", () => {
      expect(queryKeys.clients.byId("c-1")).toEqual(["clients", "c-1"]);
    });

    it("dropdown() returns correct key", () => {
      expect(queryKeys.clients.dropdown()).toEqual(["clients", "dropdown"]);
    });
  });

  describe("invoices", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.invoices.all()).toEqual(["invoices"]);
    });

    it("list() without params returns base key", () => {
      expect(queryKeys.invoices.list()).toEqual(["invoices", "list"]);
    });

    it("list() with params includes them", () => {
      expect(queryKeys.invoices.list({ page: 1, search: "INV" })).toEqual([
        "invoices",
        "list",
        { page: 1, search: "INV" },
      ]);
    });

    it("byId() includes the id", () => {
      expect(queryKeys.invoices.byId("inv-1")).toEqual(["invoices", "inv-1"]);
    });
  });

  describe("staff", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.staff.all()).toEqual(["staff"]);
    });

    it("list() embeds params for cache granularity", () => {
      expect(queryKeys.staff.list({ page: 1, search: "", status: "active" })).toEqual([
        "staff",
        "list",
        { page: 1, search: "", status: "active" },
      ]);
    });

    it("byId() includes the id", () => {
      expect(queryKeys.staff.byId("s-1")).toEqual(["staff", "s-1"]);
    });

    it("dropdown() returns correct key", () => {
      expect(queryKeys.staff.dropdown()).toEqual(["staff", "dropdown"]);
    });
  });

  describe("properties", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.properties.all()).toEqual(["properties"]);
    });

    it("list() without params returns base key", () => {
      expect(queryKeys.properties.list()).toEqual(["properties", "list"]);
    });

    it("list() with params includes them", () => {
      expect(queryKeys.properties.list({ page: 1, search: "" })).toEqual([
        "properties",
        "list",
        { page: 1, search: "" },
      ]);
    });

    it("photos() includes property id", () => {
      expect(queryKeys.properties.photos("p-1")).toEqual(["properties", "p-1", "photos"]);
    });

    it("dropdown() returns correct key", () => {
      expect(queryKeys.properties.dropdown()).toEqual(["properties", "dropdown"]);
    });
  });

  describe("recurring", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.recurring.all()).toEqual(["recurring"]);
    });

    it("list() without params returns base key", () => {
      expect(queryKeys.recurring.list()).toEqual(["recurring", "list"]);
    });

    it("byId() includes the id", () => {
      expect(queryKeys.recurring.byId("r-1")).toEqual(["recurring", "r-1"]);
    });
  });

  describe("dashboard", () => {
    it("today() returns correct key", () => {
      expect(queryKeys.dashboard.today()).toEqual(["dashboard", "today"]);
    });
  });

  describe("settings", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.settings.all()).toEqual(["settings"]);
    });

    it("list() returns correct key", () => {
      expect(queryKeys.settings.list()).toEqual(["settings", "list"]);
    });
  });

  describe("metrics", () => {
    it("operational() includes period", () => {
      expect(queryKeys.metrics.operational("30")).toEqual(["metrics", "operational", "30"]);
    });

    it("business() includes period", () => {
      expect(queryKeys.metrics.business("7")).toEqual(["metrics", "business", "7"]);
    });
  });

  describe("calendar", () => {
    it("all() returns correct key", () => {
      expect(queryKeys.calendar.all()).toEqual(["calendar"]);
    });

    it("jobs() returns correct key", () => {
      expect(queryKeys.calendar.jobs()).toEqual(["calendar", "jobs"]);
    });
  });

  describe("staffDashboard", () => {
    it("myJobs() includes userId", () => {
      expect(queryKeys.staffDashboard.myJobs("user-1")).toEqual([
        "staffDashboard",
        "myJobs",
        "user-1",
      ]);
    });

    it("checklistProgress() includes userId", () => {
      expect(queryKeys.staffDashboard.checklistProgress("user-1")).toEqual([
        "staffDashboard",
        "checklist",
        "user-1",
      ]);
    });
  });
});
