import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "@/src/components/RichTextEditor";

describe("RichTextEditor", () => {
  it("keeps typed characters, spaces and accents in order", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange}/>);
    const editor = await screen.findByRole("textbox", { name: "Rich text" });
    await user.click(editor);
    await user.type(editor, "ação rápida");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("<p>ação rápida</p>"));
    expect(editor.textContent).toContain("ação rápida");
  });

  it("reinitializes content when the selected node changes", async () => {
    const onChange = vi.fn();
    const view = render(<RichTextEditor key="one" value="<p>First node</p>" onChange={onChange}/>);
    expect((await screen.findByRole("textbox", { name: "Rich text" })).textContent).toContain("First node");
    view.rerender(<RichTextEditor key="two" value="<p>Second node</p>" onChange={onChange}/>);
    expect((await screen.findByRole("textbox", { name: "Rich text" })).textContent).toContain("Second node");
    expect(screen.queryByText("First node")).toBeNull();
  });

  it("formats selected text and exposes the active toolbar state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Format me</p>" onChange={onChange}/>);
    const editor = await screen.findByRole("textbox", { name: "Rich text" });
    await user.click(editor);
    await user.keyboard("{Control>}a{/Control}");
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("<p><strong>Format me</strong></p>"));
    expect(screen.getByRole("button", { name: "Bold" }).getAttribute("aria-pressed")).toBe("true");
  });
});
