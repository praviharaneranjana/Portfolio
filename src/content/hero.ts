import type { CodeCard } from "@/types/content";

// Floating editor cards around the hero sculpture (desktop only). Keep snippets short — 4–7 lines.
export const heroCards: CodeCard[] = [
  {
    id: "auction",
    kind: "code",
    title: "BidService.cs",
    badge: "ASP.NET",
    language: "csharp",
    code: `public sealed record Bid(Guid LotId, decimal Amount);

// Highest bid wins — validated in one transaction
public async Task<Result> PlaceAsync(Bid bid)
{
    await using var tx = await _db.BeginAsync();
    return await _lots.AcceptAsync(bid, tx);
}`,
    position: { top: "7.5rem", left: "3%" },
    width: "21rem",
    depth: 34,
  },
  {
    id: "operate",
    kind: "metrics",
    title: "Operate // Dashboard",
    badge: "Prod",
    metrics: [
      { label: "Query load", value: "−95%" },
      { label: "OOM crashes", value: "3 → 0" },
      { label: "Pages → React", value: "~130" },
    ],
    position: { top: "9rem", right: "3.5%" },
    width: "17rem",
    depth: -42,
  },
  {
    id: "unity",
    kind: "code",
    title: "PlayerMotor.cs",
    badge: "Unity 6",
    language: "csharp",
    code: `void FixedUpdate()
{
    var move = _input.Move.ReadValue<Vector2>();
    _rb.linearVelocity = move * speed;
}`,
    position: { top: "36vh", right: "6%" },
    width: "17.5rem",
    depth: -24,
  },
  {
    id: "shai",
    kind: "pipeline",
    title: "No-show risk // SHAI",
    badge: "AUC 0.73",
    steps: ["Features", "XGBoost", "SHAP"],
    position: { top: "40vh", left: "13%" },
    width: "16rem",
    depth: 28,
  },
];
