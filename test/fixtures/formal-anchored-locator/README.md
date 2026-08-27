# formal-anchored-locator

A `Formal` block whose `file:` carries an anchor — `formal/Main.lean#main_result` — and which is the
**only** thing in the ledger citing that file.

Both halves matter. Before FE-42 the anchored spelling was compared against the file set without the
anchor being removed, so it matched nothing and the claim's artifact disappeared from
`inspected.surfaces`: the envelope reported that it had inspected *no* cited artifacts for a ledger
that cites one. `sorry-certified` cannot show this, because its Evidence block cites the same file a
second time and that route kept the surface populated no matter what the Formal block said.

So the removed `- formal — formal/Main.lean` evidence line is load-bearing. Putting it back would
make `test/anchored-locator.test.mjs` B2 vacuous, and B2 has an assertion that says so.
