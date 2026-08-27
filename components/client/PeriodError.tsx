/**
 * Shown when a client asked for a date range the server would not accept.
 *
 * The page still renders — with the 30-day default — but it says so out loud.
 * Silently answering a different question than the one asked is how a client
 * ends up quoting the wrong numbers to their own leadership.
 */
export function PeriodError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <span className="material-symbols-outlined text-[18px] text-amber-600">
        warning
      </span>
      <p className="text-sm text-amber-900">
        {message} Menampilkan 30 hari terakhir sebagai gantinya.
      </p>
    </div>
  );
}
