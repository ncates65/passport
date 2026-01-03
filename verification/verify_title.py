from playwright.sync_api import sync_playwright, expect

def verify_title():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Passport Pal", timeout=10000)

            # Verify Title
            expect(page).to_have_title("Passport Pal - Child Passport Guide")
            print("Title verified successfully")

            page.screenshot(path="verification/verification_title.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_title()
