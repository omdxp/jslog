import { info, String, Int, Bool } from "../index";

console.log("=== jslog now supports Go slog-style variadic parameters! ===\n");

console.log("Old style (still works):");
info(
  "User login",
  String("user", "alice"),
  Int("attempts", 3),
  Bool("success", true)
);

console.log("\nNew style (Go slog compatible):");
info("User login", "user", "alice", "attempts", 3, "success", true);

console.log("\nBoth produce the same output! 🎉");
console.log("\nYou can even mix them:");
info("Mixed", String("typed", "value"), "key1", "value1", Int("count", 42));

console.log("\n✅ jslog matches Go's slog.Info() API exactly!");
