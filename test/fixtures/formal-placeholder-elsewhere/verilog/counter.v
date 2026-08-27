// A Verilog module, not a Coq development. `.v` is shared between the two, and the word `admit`
// appears here as an ordinary identifier. The Coq gate must not fire on this file.
module counter (
    input wire clk,
    input wire reset,
    input wire admit,
    output reg [7:0] count
);
  always @(posedge clk) begin
    if (reset) count <= 8'b0;
    else if (admit) count <= count + 1;
  end
endmodule
