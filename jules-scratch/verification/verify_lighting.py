from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Wait for the canvas to be visible
        canvas = page.locator('canvas')
        expect(canvas).to_be_visible(timeout=10000)

        # Click the canvas to start the game and lock the pointer
        canvas.click()

        # Wait for the world to render
        page.wait_for_timeout(10000)

        page.screenshot(path="jules-scratch/verification/verification.png")
        browser.close()

if __name__ == "__main__":
    run()