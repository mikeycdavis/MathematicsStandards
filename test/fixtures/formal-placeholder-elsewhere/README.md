# formal-placeholder-elsewhere

The named declaration is clean; the placeholder is somewhere else in the same file.

`main_result` is what the `Formal` block names and it carries no `sorry`. `unrelated_scratch`, further
down `formal/Main.lean`, does. Standard 16 R3 prohibits a placeholder "anywhere the target's proof
depends on", and nothing in this framework traces that chain — so the containing file is a
conservative envelope around it, and `formal.placeholder-in-chain` must still fire here.

This fixture exists to make that conservatism testable. In `formal-anchored-locator` the placeholder
sits *inside* the named declaration, so narrowing the scan to the anchor would leave that fixture
failing and no test would notice the change. Here, narrowing makes the rule pass — which is a
false-assurance regression on a forbidden, non-exemptible rule, and B3 catches it.

The finding this produces is also the one B4 reads: it must say the placeholder is somewhere in the
file and that the dependency chain was not traced, so it cannot be read as "your theorem is unproved".
