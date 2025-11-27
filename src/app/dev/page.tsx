"use client";

import { useState } from "react";

export default function TestCronPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCronJob = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/cron/update-overdue-loans`,
        {
          method: "POST",
        },
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to test cron job" });
    }
    setLoading(false);
  };

  const checkOverdueLoans = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/loans/overdue`,
      );
      const data = await response.json();
      setResult({ type: "check", data });
    } catch (error) {
      setResult({ error: "Failed to check overdue loans" });
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Development Cron Job Testing</h1>

      <div className="mb-6 space-y-4">
        <button
          onClick={testCronJob}
          disabled={loading}
          className="rounded bg-blue-500 px-6 py-3 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Running..." : "Test Update Overdue Loans"}
        </button>

        <button
          onClick={checkOverdueLoans}
          disabled={loading}
          className="ml-4 rounded bg-green-500 px-6 py-3 text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Overdue Loans"}
        </button>
      </div>

      {result && (
        <div className="rounded-lg bg-gray-100 p-4">
          <h2 className="mb-2 text-xl font-semibold">Result:</h2>
          <pre className="overflow-x-auto rounded bg-black p-4 text-green-400">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
