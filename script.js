// Debounce function (utility)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

document.addEventListener('DOMContentLoaded', () => {

    // --- Menu Hamburger ---
    const hamburgerButton = document.querySelector('.hamburger');
    const navMenu = document.querySelector('header nav');
    if (hamburgerButton && navMenu) {
        hamburgerButton.addEventListener('click', () => {
            navMenu.classList.toggle('nav-active');
            const isExpanded = navMenu.classList.contains('nav-active');
            hamburgerButton.setAttribute('aria-expanded', isExpanded);
            const icon = hamburgerButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isExpanded);
                icon.classList.toggle('fa-times', isExpanded);
            }
        });
        hamburgerButton.setAttribute('aria-controls', 'main-nav');
        navMenu.querySelector('ul')?.setAttribute('id', 'main-nav');
        hamburgerButton.setAttribute('aria-expanded', 'false');
    }

    // --- Navegação Ativa ---
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('header nav ul li a');
    navLinks.forEach(link => {
        let linkHref = link.getAttribute('href');
        linkHref = linkHref.startsWith('./') ? linkHref.substring(2) : linkHref;
        const pageName = (currentPage === '' || currentPage === '/') ? 'index.html' : currentPage;
        if (linkHref === pageName) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });

    // --- Slider Drag Logic (Reusable Function) ---
    function setupSliderDrag(sliderElement, trackElement, nextFunc, prevFunc, isTimeline = false) {
        if (!sliderElement) return;

        let isDragging = false;
        let startX;
        let currentX;
        const dragThreshold = 50; // Min distance to trigger slide/step change

        const getPointerX = (event) => event.touches ? event.touches[0].clientX : event.clientX;

        const handleDragStart = (event) => {
            // Ignore drag start on interactive elements within the slider
            if (event.target.closest('button, a, input, .timeline-dot')) return;

            // Ensure drag starts within the intended area
            if (isTimeline && !event.target.closest('.timeline-track-container')) {
                 // Allow drag start on dots/progress area for timeline? No, let's restrict to track container
                 if (event.target.closest('.timeline-dots, .timeline-progress')) return;
             }
             if (!isTimeline && !event.target.closest('.carousel-slides-container')) {
                 // Allow drag start on nav/pagination area for carousel? No, restrict to slides container
                 if (event.target.closest('.carousel-nav, .carousel-pagination')) return;
             }

            isDragging = true;
            startX = getPointerX(event);
            currentX = startX;
            sliderElement.classList.add('is-dragging');
            sliderElement.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; // Prevent text selection during drag
            if (isTimeline && trackElement) trackElement.style.transition = 'none'; // Disable transition during drag for timeline
        };

        const handleDragMove = (event) => {
            if (!isDragging) return;
            currentX = getPointerX(event);
            // Optional: Move the track visually during drag (more complex, especially for carousel)
            // For simplicity, we only calculate the difference on drag end
        };

        const handleDragEnd = (event) => {
            if (!isDragging) return;
            isDragging = false;
            sliderElement.classList.remove('is-dragging');
            sliderElement.style.cursor = 'grab';
            document.body.style.userSelect = ''; // Re-enable text selection
            if (isTimeline && trackElement) trackElement.style.transition = ''; // Re-enable transition for timeline

            const endX = currentX;
            const diffX = endX - startX;

            if (Math.abs(diffX) > dragThreshold) {
                if (diffX < 0) { // Dragged left (Next)
                    if (typeof nextFunc === 'function') nextFunc();
                } else { // Dragged right (Previous)
                    if (typeof prevFunc === 'function') prevFunc();
                }
            } else if (isTimeline && trackElement) {
                 // **Timeline Snapback Fix:** If drag was too short, reset transform to current step
                 // This requires accessing the current index and the goToStep function
                 // We'll handle this within the timeline setup where these are accessible
                 // For now, just ensure the transition is re-enabled
            }
        };

        // Use pointer events for better compatibility (touch & mouse)
        sliderElement.addEventListener('pointerdown', handleDragStart);
        document.addEventListener('pointermove', handleDragMove, { passive: true }); // Passive for scroll performance
        document.addEventListener('pointerup', handleDragEnd);
        document.addEventListener('pointerleave', handleDragEnd); // Handle case where pointer leaves the window

        // Prevent image dragging which interferes
        sliderElement.querySelectorAll('img').forEach(img => {
            img.addEventListener('dragstart', (e) => e.preventDefault());
        });
    }

    // --- Funcionalidade do Carrossel (caracteristicas.html) ---
    const carousel = document.querySelector('.carousel');
    if (carousel) {
        const slidesContainer = carousel.querySelector('.carousel-slides-container');
        const slides = Array.from(slidesContainer?.children).filter(el => el.classList.contains('carousel-slide')) || [];
        const prevButton = carousel.querySelector('.carousel-prev');
        const nextButton = carousel.querySelector('.carousel-next');
        const paginationContainer = carousel.querySelector('.carousel-pagination');
        let dots = [];
        let currentIndex = 0;
        let carouselResizeObserver = null; // Store observer instance

        if (slides.length > 0 && slidesContainer && prevButton && nextButton && paginationContainer) {

            // Function to set the container height based on the *active* slide
            function setContainerHeight() {
                if (!slidesContainer || slides.length === 0) return;
                const activeSlide = slides[currentIndex];
                if (activeSlide) {
                    // Ensure styles are computed before measuring scrollHeight
                    requestAnimationFrame(() => {
                         const slideHeight = activeSlide.scrollHeight;
                         // console.log(`[Carousel] Setting height for index ${currentIndex}: ${slideHeight}px`);
                         slidesContainer.style.height = `${slideHeight}px`;
                    });
                } else {
                    // Fallback if no slide is active yet (shouldn't happen after init)
                    slidesContainer.style.height = '250px'; // Default fallback
                }
            }

            const debouncedSetHeight = debounce(setContainerHeight, 150); // Debounce resize adjustments

            // Initialize ResizeObserver or fallback event listener
            if ('ResizeObserver' in window) {
                 carouselResizeObserver = new ResizeObserver(entries => {
                    // We only care that *something* changed size inside
                    debouncedSetHeight();
                 });
                 // Observe the container and potentially the active slide
                 carouselResizeObserver.observe(slidesContainer);
                 // Observing individual slides can be tricky with absolute positioning
                 // slides.forEach(slide => carouselResizeObserver.observe(slide));
            } else {
                 window.addEventListener('resize', debouncedSetHeight);
            }
            // Also recalculate on image load within slides
             slides.forEach(slide => {
                 slide.querySelectorAll('img').forEach(img => {
                     img.addEventListener('load', debouncedSetHeight);
                 });
             });


            // Create pagination dots
            paginationContainer.innerHTML = ''; // Clear existing dots if any
            slides.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.classList.add('pagination-dot');
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-selected', 'false');
                dot.setAttribute('aria-controls', `carousel-slide-${index + 1}`); // Assuming slides get IDs
                dot.setAttribute('aria-label', `Ir para slide ${index + 1}`);
                dot.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering drag
                    showSlide(index);
                });
                paginationContainer.appendChild(dot);
                dots.push(dot);
            });

            // Function to display a specific slide
            function showSlide(index) {
                const newIndex = (index + slides.length) % slides.length;
                // console.log(`[Carousel] Showing slide. Current: ${currentIndex}, New: ${newIndex}`);

                // Update active slide class
                slides.forEach((slide, i) => {
                    const isActive = i === newIndex;
                    slide.classList.toggle('active', isActive);
                    slide.setAttribute('aria-hidden', !isActive);
                    slide.id = `carousel-slide-${i + 1}`; // Assign ID for aria-controls
                    if (isActive) {
                        // If we observe individual slides, disconnect old, connect new
                        // if (carouselResizeObserver && slides[currentIndex]) carouselResizeObserver.unobserve(slides[currentIndex]);
                        // if (carouselResizeObserver && slides[newIndex]) carouselResizeObserver.observe(slides[newIndex]);
                    }
                });

                // Update pagination dots
                dots.forEach((dot, i) => {
                    const isActive = i === newIndex;
                    dot.classList.toggle('active', isActive);
                    dot.setAttribute('aria-selected', isActive);
                });

                currentIndex = newIndex;

                // Set container height AFTER updating the active slide
                setContainerHeight();
            }

            const nextSlide = () => showSlide(currentIndex + 1);
            const prevSlide = () => showSlide(currentIndex - 1);

            // Add Arrow Button Listeners
            prevButton.addEventListener('click', prevSlide);
            nextButton.addEventListener('click', nextSlide);

            // Setup Drag functionality
            // Pass the element where dragging should start (slides container)
            setupSliderDrag(slidesContainer, null, nextSlide, prevSlide, false);

            // Initialize the first slide
             setTimeout(() => {
                 showSlide(0);
             }, 100); // Small delay to ensure layout is stable

        } else {
             console.warn("[Carousel] Initialization failed: Missing elements or no slides found.");
             if (carousel) carousel.style.display = 'none'; // Hide broken carousel
        }
    }


    // --- Timeline Slider (ruptura.html) ---
    const timelineSlider = document.querySelector('.timeline-slider');
    // Make currentStepIndex accessible within this scope for drag snapback
    let currentStepIndex = 0;
    let timelineResizeObserver = null;

    if (timelineSlider) {
        const trackContainer = timelineSlider.querySelector('.timeline-track-container');
        const track = timelineSlider.querySelector('.timeline-track');
        const steps = Array.from(track?.children).filter(el => el.classList.contains('timeline-step')) || [];
        const dotsContainer = timelineSlider.querySelector('.timeline-dots');
        const progressElement = timelineSlider.querySelector('.timeline-progress'); // The line itself
        let timelineDots = []; // Array to hold dot wrapper elements
        let gapValue = 0; // Store calculated gap
        const timelineDates = ["Início", "1865", "Anos 70", "1871", "Fim"]; // Dates for dots

        // Define goToStep within the scope where currentStepIndex is accessible
        function goToStep(index) {
            const newIndex = Math.max(0, Math.min(index, steps.length - 1));
            // console.log(`[Timeline] Going to step ${newIndex}`);

            currentStepIndex = newIndex; // Update global index

            // Calculate translation based on step width and gap
            const stepWidth = steps[0]?.offsetWidth; // Get actual width of a step
            if (!stepWidth) {
                console.error("[Timeline] Cannot get step width.");
                return;
            }
            // Translation = index * (width of one step + gap between steps)
            const totalTranslate = currentStepIndex * (stepWidth + gapValue);
            // console.log(`[Timeline] Translating by: -(${currentStepIndex} * (${stepWidth} + ${gapValue})) = -${totalTranslate}px`);
            track.style.transform = `translateX(-${totalTranslate}px)`;

            updateTimelineUI(); // Update dots/dates
            requestAnimationFrame(adjustTimelineContainerHeight); // Adjust height smoothly
        }

        if (steps.length > 0 && track && trackContainer && dotsContainer && progressElement) {

             // Function to calculate the gap between steps
             function calculateGap() {
                if (steps.length > 1 && track) {
                    const style = window.getComputedStyle(track);
                    gapValue = parseFloat(style.gap) || 0;
                    // console.log(`[Timeline] Calculated gap: ${gapValue}px`);
                } else { gapValue = 0; }
             }

             // Function to position the dots along the progress line
             function positionDots() {
                 if (!progressElement || timelineDots.length !== steps.length || steps.length === 0) return;

                 const progressWidth = progressElement.offsetWidth; // Width of the line

                 timelineDots.forEach((wrapper, index) => {
                     // Position = (index / (total items - 1)) * 100%
                     // Handle single item case
                     const positionPercent = (steps.length === 1) ? 50 : (index * 100 / (steps.length - 1));
                     wrapper.style.left = `${positionPercent}%`;
                 });
             }

            // Function to adjust container height based on the current step
            function adjustTimelineContainerHeight() {
                 if (!trackContainer || steps.length === 0) return;
                 const activeStep = steps[currentStepIndex];
                 if (activeStep) {
                     const stepHeight = activeStep.scrollHeight;
                     // console.log(`[Timeline] Setting min-height for index ${currentStepIndex}: ${stepHeight}px`);
                     // Add some padding if needed
                     trackContainer.style.minHeight = `${stepHeight + 20}px`;
                 }
            }
            const debouncedTimelineAdjustHeight = debounce(adjustTimelineContainerHeight, 150);
            const debouncedRecalculateLayout = debounce(() => {
                calculateGap();
                positionDots();
                debouncedTimelineAdjustHeight();
                // Recalculate transform in case width/gap changed
                goToStep(currentStepIndex);
            }, 200);


             // Initialize ResizeObserver or fallback event listener
             if ('ResizeObserver' in window) {
                 timelineResizeObserver = new ResizeObserver(debouncedRecalculateLayout);
                 timelineResizeObserver.observe(trackContainer);
                 // Observing steps might be needed if their content changes dynamically
                 // steps.forEach(step => timelineResizeObserver.observe(step));
             } else {
                 window.addEventListener('resize', debouncedRecalculateLayout);
             }
             // Also recalculate on image load within steps
             steps.forEach(step => {
                 step.querySelectorAll('img').forEach(img => {
                     img.addEventListener('load', debouncedTimelineAdjustHeight);
                 });
             });


            // Create timeline dots and dates
            if (dotsContainer) {
                 dotsContainer.innerHTML = ''; // Clear existing
                 steps.forEach((_, index) => {
                     const wrapper = document.createElement('div');
                     wrapper.classList.add('timeline-dot-wrapper');

                     const dot = document.createElement('button');
                     dot.classList.add('timeline-dot');
                     dot.setAttribute('role', 'tab');
                     dot.setAttribute('aria-selected', 'false');
                     dot.setAttribute('aria-controls', `timeline-step-${index + 1}`); // Assuming steps get IDs
                     dot.setAttribute('aria-label', `Ir para passo ${index + 1}: ${timelineDates[index] || ''}`);
                     dot.addEventListener('click', (e) => {
                         e.stopPropagation(); // Prevent drag
                         goToStep(index);
                     });

                     const dateSpan = document.createElement('span');
                     dateSpan.classList.add('timeline-date');
                     dateSpan.textContent = timelineDates[index] || '';
                     dateSpan.setAttribute('aria-hidden', 'true'); // Hide from screen readers, info is on button

                     wrapper.appendChild(dot);
                     wrapper.appendChild(dateSpan);
                     dotsContainer.appendChild(wrapper);
                     timelineDots.push(wrapper); // Store the wrapper

                     // Assign ID to step for aria-controls
                     steps[index].id = `timeline-step-${index + 1}`;
                     steps[index].setAttribute('role', 'tabpanel');
                 });
            }

            // Function to update dot/date active states
            function updateTimelineUI() {
                 if (timelineDots.length > 0) {
                     timelineDots.forEach((wrapper, i) => {
                         const isActive = i === currentStepIndex;
                         wrapper.classList.toggle('active', isActive); // Style wrapper for date
                         const dotButton = wrapper.querySelector('.timeline-dot');
                         if(dotButton) {
                             dotButton.classList.toggle('active', isActive); // Style dot itself
                             dotButton.setAttribute('aria-selected', isActive);
                         }
                     });
                 }
                 // Update step visibility for screen readers
                 steps.forEach((step, i) => {
                    step.setAttribute('aria-hidden', i !== currentStepIndex);
                 });
            }

            const nextStep = () => goToStep(currentStepIndex + 1);
            const prevStep = () => goToStep(currentStepIndex - 1);

            // Setup Drag functionality for the timeline track container
            setupSliderDrag(trackContainer, track, nextStep, prevStep, true);

            // Add snapback logic to the drag end handler specifically for timeline
            const originalDragEnd = trackContainer.onpointerup; // Get the handler set by setupSliderDrag
            trackContainer.addEventListener('pointerup', (event) => {
                 // Call original handler first if exists
                 if (typeof originalDragEnd === 'function') originalDragEnd(event);

                 // Add snapback logic
                 const isDraggingClass = trackContainer.classList.contains('is-dragging'); // Check if drag was active
                 if (!isDraggingClass) { // Only snapback if drag ended *without* triggering next/prev
                     const style = window.getComputedStyle(track);
                     const matrix = new DOMMatrixReadOnly(style.transform);
                     const currentTranslateX = matrix.m41;

                     const stepWidth = steps[0]?.offsetWidth;
                     if (stepWidth) {
                        const targetTranslateX = -currentStepIndex * (stepWidth + gapValue);
                        // If current position is not the target position (due to short drag), snap back
                        if (Math.abs(currentTranslateX - targetTranslateX) > 1) { // Tolerance of 1px
                            // console.log("[Timeline] Snapping back.");
                            track.style.transition = ''; // Ensure transition is enabled
                            goToStep(currentStepIndex); // Re-apply transform for current index
                        }
                     }
                 }
            });


             // Initial setup calculation and first step display
             setTimeout(() => {
                 calculateGap();
                 positionDots();
                 goToStep(0); // Go to first step and trigger height adjustment
             }, 150); // Delay for layout stability

        } else {
            console.warn("[Timeline] Initialization failed: Missing elements or no steps found.");
            if(timelineSlider) timelineSlider.style.display = 'none';
        }
    }


    // --- Animação de Scroll (Fade-in + Stagger) ---
    const animatedElements = document.querySelectorAll(
        // Select elements to animate - exclude list items initially
        'article, .team-intro, .team-member, .timeline-slider, .carousel, h2, h3, img.featured-image, img.float-left, p:not([class*="team-member"])'
    );
    const animatedLists = document.querySelectorAll('article ul'); // Select lists separately

    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null, // relative to the viewport
            rootMargin: '0px',
            threshold: 0.1 // Trigger when 10% of the element is visible
        };

        const observerCallback = (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');

                    // Check if the target is a team member to apply stagger based on index
                    if (entry.target.classList.contains('team-member')) {
                        const parent = entry.target.parentElement;
                        if (parent) {
                           // Find index among siblings that are also team members
                           const index = Array.from(parent.children)
                                            .filter(el => el.classList.contains('team-member'))
                                            .indexOf(entry.target);
                           entry.target.style.setProperty('--order', index);
                           // Delay calculation is now done in CSS: transition-delay: calc(var(--order, 0) * 80ms);
                        }
                    }

                    observer.unobserve(entry.target); // Stop observing once visible
                }
            });
        };

        const listObserverCallback = (entries, observer) => {
             entries.forEach((entry) => {
                 if (entry.isIntersecting) {
                     const list = entry.target;
                     list.classList.add('is-visible'); // Make the UL container visible first

                     const listItems = list.querySelectorAll('li');
                     listItems.forEach((li, index) => {
                         // Set the order property for CSS delay calculation
                         li.style.setProperty('--order', index);
                         // Add class slightly after UL becomes visible to trigger staggered transition
                         // setTimeout(() => { // Using CSS var delay is better
                             li.classList.add('li-visible');
                         // }, 50 + index * 50); // Example of JS delay, but CSS is preferred
                     });

                     observer.unobserve(list); // Stop observing the list once items are triggered
                 }
             });
        };

        const scrollObserver = new IntersectionObserver(observerCallback, observerOptions);
        animatedElements.forEach(el => {
            if(el) scrollObserver.observe(el);
        });

        const listObserver = new IntersectionObserver(listObserverCallback, observerOptions);
        animatedLists.forEach(ul => {
            if(ul) listObserver.observe(ul);
        });

    } else {
        // Fallback for browsers without IntersectionObserver
        console.warn("Intersection Observer não suportado. Animações de scroll desativadas.");
        animatedElements.forEach(el => {
            if(el) el.classList.add('is-visible'); // Make elements visible immediately
        });
        animatedLists.forEach(ul => {
            if(ul) {
                ul.classList.add('is-visible');
                ul.querySelectorAll('li').forEach(li => li.classList.add('li-visible'));
            }
        });
    }

    // --- Header Shrink on Scroll ---
    const header = document.querySelector('header');
    if (header) {
        const scrollThreshold = 50; // Pixels to scroll before shrinking
        const handleScroll = () => {
            const isScrolled = window.scrollY > scrollThreshold;
            header.classList.toggle('header-scrolled', isScrolled);
        };
        // Use passive listener for performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        // Initial check in case the page loads already scrolled
        handleScroll();
    }

    // --- Add body ID for page-specific CSS ---
    const body = document.body;
    let pageIdName = window.location.pathname.split('/').pop();
    // Handle root path or index.html
    pageIdName = (pageIdName === '' || pageIdName === 'index.html') ? 'index' : pageIdName.replace('.html', '');
    const bodyId = `page-${pageIdName}`;
    body.id = bodyId;

});