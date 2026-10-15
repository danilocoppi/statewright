// @vitest-environment jsdom
import "../dom.js";
import i18n from "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupportBadge } from "@/components/SupportBadge";
import { REPOSITORY, WALLETS } from "@/config/app";
import ptCommon from "@/i18n/locales/pt-BR/common.json";

/** The wallets, exactly as published: a test against these strings guards them from any change. */
const SOLANA = "DCA31TRz39qmKPseSRMjANN7cGYoWGUbtkC582oMRyWy";
const EVM = "0x54636195948915f091466f027025973328813a3a";

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await act(() => i18n.changeLanguage("en"));
});

/** The badge beside something else on the page, to click outside it. */
function renderBadge() {
  render(
    <>
      <p>The page</p>
      <SupportBadge />
    </>
  );
  return screen.getByRole("button", { name: "Support" });
}

describe("the support badge", () => {
  it("publishes the repository and the two wallets, exactly", () => {
    expect(REPOSITORY).toBe("https://github.com/danilocoppi/statewright");
    expect(WALLETS).toEqual([
      { id: "solana", network: "Solana", address: SOLANA },
      { id: "evm", network: "ETH · BSC · Polygon (EVM)", address: EVM }
    ]);
  });

  it("opens a popover with each wallet's network and full address, the note and the source", async () => {
    const user = userEvent.setup();
    const badge = renderBadge();
    expect(badge.getAttribute("aria-expanded")).toBe("false");
    expect(badge.getAttribute("aria-haspopup")).toBe("dialog");
    await user.click(badge);
    const popover = screen.getByRole("dialog", { name: "Support Statewright" });
    expect(badge.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(popover);
    expect(popover.textContent).toContain(
      "Statewright is free and open source (MIT). If it helps you, a donation keeps it going."
    );
    const wallets = within(popover).getAllByRole("listitem");
    expect(wallets.map(wallet => within(wallet).getByRole("heading").textContent)).toEqual([
      "Solana",
      "ETH · BSC · Polygon (EVM)"
    ]);
    expect(wallets.map(wallet => wallet.querySelector("code").textContent)).toEqual([SOLANA, EVM]);
    expect(within(popover).getByText("Send only on these networks.")).toBeTruthy();
    const source = within(popover).getByRole("link", { name: /^Source on GitHub/ });
    expect(source.getAttribute("href")).toBe(REPOSITORY);
    expect(source.getAttribute("target")).toBe("_blank");
    expect(source.getAttribute("rel")).toBe("noreferrer");
  });

  it("copies each address exactly, and says so for a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(renderBadge());
    const popover = screen.getByRole("dialog", { name: "Support Statewright" });
    await user.click(within(popover).getByRole("button", { name: "Copy the Solana address" }));
    expect(writeText).toHaveBeenLastCalledWith(SOLANA);
    expect(within(popover).getByRole("button", { name: "Copied" })).toBeTruthy();
    await user.click(within(popover).getByRole("button", { name: "Copy the ETH · BSC · Polygon (EVM) address" }));
    expect(writeText).toHaveBeenLastCalledWith(EVM);
    expect(writeText).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTime(1600));
    expect(within(popover).queryByRole("button", { name: "Copied" })).toBeNull();
    expect(within(popover).getAllByRole("button", { name: /^Copy the / })).toHaveLength(2);
  });

  it("closes on Esc, giving the focus back to the badge", async () => {
    const user = userEvent.setup();
    const badge = renderBadge();
    await user.click(badge);
    await user.tab();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(badge);
    expect(badge.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on a click outside it, and stays open on a click inside", async () => {
    const user = userEvent.setup();
    const badge = renderBadge();
    await user.click(badge);
    await user.click(screen.getByText("Send only on these networks."));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.click(screen.getByText("The page"));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(badge);
    await user.click(badge);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is reached and used with the keyboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderBadge();
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(document.activeElement.getAttribute("aria-label")).toBe("Copy the Solana address");
    await user.keyboard(" ");
    expect(writeText).toHaveBeenLastCalledWith(SOLANA);
  });

  it("speaks the interface's language", async () => {
    i18n.addResourceBundle("pt-BR", "common", ptCommon);
    await act(() => i18n.changeLanguage("pt-BR"));
    const user = userEvent.setup();
    await user.click(render(<SupportBadge />) && screen.getByRole("button", { name: "Apoiar" }));
    const popover = screen.getByRole("dialog", { name: "Apoie o Statewright" });
    expect(popover.textContent).toContain("Envie apenas por estas redes.");
    expect(within(popover).getByRole("button", { name: "Copiar o endereço Solana" })).toBeTruthy();
    expect(within(popover).getByRole("link", { name: /^Código no GitHub/ })).toBeTruthy();
  });
});
