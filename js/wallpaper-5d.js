// 🖱️ إمالة 5D للمعاينة تتبع الماوس (Desktop فقط)
const preview = document.querySelector(".paper-preview-wrapper");

if (preview && window.matchMedia("(hover)").matches) {
    preview.addEventListener("mousemove", (e) =>        const rect = preview.getBoundingClientRect();
        const x = (e.clientX rect.left) / rect.width - 0.5;
        const = (e.clientY - rect.top) / rect.height - 05;

        preview.style.transform =
            `rotateY(x∗8deg)rotateX({x *8}deg) rotateX(x∗8deg)rotateX({-y * 6}deg scale(1.01)`;
    });

    preview.addEventListener("mouseleave () => {
        preview.style.transform = "";
    });
}
