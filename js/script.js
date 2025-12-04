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
                const stepNum = parseInt(step);

                // Update body class for rectangle animations
                document.body.className = `step-${step}`;
                
                // Swap sides for section 2 and 5
                if (stepNum >= 2 && stepNum <= 5) {
                document.body.classList.add('swap-sides');
                }
                else {
                    document.body.classList.remove('swap-sides');
                }
                
                switch (step) {
                    case '1': drawPhoenixWaterHistory();
                    break;
                    case '2': drawPhoenixPopProjections();
                    break;
                    case '3': drawPhoenixWaterSources();
                    break;
                    case '4': drawRiverChart();
                    break;
                    case '6': drawLakeMeadStorage();
                    break;
                    case '7': drawLakePowellStorage();
                    break;
                    case '8': drawGroundwaterChart();
                    break; 
                    default: break;
                }
            }
        });
    }, observerOptions);

    // Observe each trigger element
    triggers.forEach(trigger => {
        observer.observe(trigger);
    });
});