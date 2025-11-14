// CSE 478 Project

document.addEventListener('DOMContentLoaded', () => {
    const triggers = document.querySelectorAll('.scroll-trigger');

    // Observer that sets an invisible box in center of screen that triggers when
    // an element crosses the line
    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    };


    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const step = entry.target.dataset.step;
                document.body.className = `step-${step}`;
            }
        });
    }, observerOptions);


    // Observe each trigger element
    triggers.forEach(trigger => {
        observer.observe(trigger);
    });
});