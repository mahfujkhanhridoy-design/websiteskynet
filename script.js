const contactForm = document.getElementById("contactForm");
const formMessage = document.getElementById("formMessage");

contactForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const formData = new FormData(contactForm);

    const data = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        message: formData.get("message")
    };

    try {

        const response = await fetch("/api/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        formMessage.textContent = result.message;

        if (result.success) {
            contactForm.reset();
        }

    } catch (error) {

        console.error(error);

        formMessage.textContent = "Something went wrong.";

    }

});