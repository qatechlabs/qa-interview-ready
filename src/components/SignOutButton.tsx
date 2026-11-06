"use client";
export function SignOutButton() {
  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        if (!confirm("Remove access from this browser? You can restore it any time with your payment ID.")) return;
        await fetch("/api/signout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      Remove from this browser
    </button>
  );
}
