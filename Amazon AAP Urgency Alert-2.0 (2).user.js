// ==UserScript==
// @name         Amazon AAP Urgency Alert
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Display urgency popup for specific sites on work orders (detail page only)
// @author       MONIMAG
// @match        https://aap-na.corp.amazon.com/*
// @updateURL    https://raw.githubusercontent.com/monimag/urgencyvalidating/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/monimag/urgencyvalidating/main/script.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Configuration - Just update this list as needed
    const URGENT_SITES = ['ACY9', 'TUS5', 'MDWA', 'SBD6', 'JFK8', 'MSP8', 'MSP1',
                          'AZAA', 'FSD1', 'TYS1', 'DCA1', 'HOU2', 'STL8', 'TUS2',
                          'OMA2', 'MCI9', 'DEN4', 'BDU5', 'MCI5','JAX3'];

    let popupShown = false; // Prevent multiple popups

    // Function to check if we're on a detail page (not list view)
    function isDetailPage() {
        // Check for "Service Details" in the page title or heading
        const pageTitle = document.title;
        const headings = document.querySelectorAll('h1, h2, h3');

        // Check title
        if (pageTitle.includes('Service Details')) {
            return true;
        }

        // Check headings
        for (let heading of headings) {
            if (heading.textContent.includes('Service Details') ||
                heading.textContent.includes('Equipment Overview') ||
                heading.textContent.includes('Service Overview')) {
                return true;
            }
        }

        // Check for specific detail page elements
        if (document.querySelector('.css-86vfqe') ||
            document.querySelector('[class*="ServiceDetails"]') ||
            document.querySelector('div:contains("Equipment Overview")')) {
            return true;
        }

        // Check URL pattern - detail pages usually have asset IDs
        const url = window.location.href;
        if (url.includes('/service/') || url.includes('/details/')) {
            return true;
        }

        return false;
    }

    // Function to check if page contains urgent site code
    function checkForUrgentSite() {
        // Look for the specific yard location element first
        const yardLocationElements = document.querySelectorAll('.css-86vfqe, [mdn-text]');

        for (let element of yardLocationElements) {
            const text = element.textContent;
            for (let site of URGENT_SITES) {
                if (text.includes(site)) {
                    return site;
                }
            }
        }

        // Fallback to checking entire page
        const pageText = document.body.innerText;
        for (let site of URGENT_SITES) {
            if (pageText.includes(site)) {
                return site;
            }
        }

        return null;
    }

    // Function to get current date formatted                                                                                                                      
    function getCurrentDate() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        return `${month}/${day}/${year}`;
    }

    // Function to create and show popup
    function showUrgencyPopup(siteCode) {
        if (popupShown) return; // Prevent duplicate popups
        popupShown = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'urgency-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create popup box
        const popup = document.createElement('div');
        popup.style.cssText = `
            background-color: #ff4444;
            border: 5px solid #cc0000;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
            animation: pulse 1s infinite;
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);

        // Popup content
        popup.innerHTML = `
            <h1 style="color: white; margin: 0 0 20px 0; font-size: 32px; font-weight: bold;">
                ⚠️ URGENT ALERT ⚠️
            </h1>
            <div style="background-color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <p style="color: #cc0000; font-size: 20px; font-weight: bold; margin: 0 0 10px 0;">
                    HIGH PRIORITY WORK ORDER
                </p>
                <p style="color: #333; font-size: 16px; margin: 10px 0;">
                    <strong>Site Code:</strong> ${siteCode}
                </p>
                <p style="color: #333; font-size: 16px; margin: 10px 0;">
                    <strong>Checked:</strong> ${getCurrentDate()}
                </p>
                <p style="color: #cc0000; font-size: 18px; font-weight: bold; margin: 15px 0 0 0;">
                    ⚡ TIRE ISSUES FOR THIS SITE NEED IMMEDIATE ACTION ⚡
                </p>
            </div>
            <button id="urgency-close-btn" style="
                background-color: white;
                color: #cc0000;
                border: 3px solid white;
                padding: 15px 40px;
                font-size: 18px;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            ">
                I UNDERSTAND - CLOSE
            </button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Close button functionality
        const closeBtn = overlay.querySelector('#urgency-close-btn');
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            overlay.remove();
            console.log('Urgency popup closed');
        });

        // Also allow clicking overlay background to close
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                console.log('Urgency popup closed (background click)');
            }
        });

        // Hover effect for button
        closeBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#cc0000';
            this.style.color = 'white';
        });

        closeBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'white';
            this.style.color = '#cc0000';
        });

        console.log('Urgency popup displayed for site:', siteCode);
    }

    // Main execution
    function checkAndShowPopup() {
        // Prevent multiple checks
        if (popupShown) return;

        // Check if we're on a detail page (not list view)
        if (!isDetailPage()) {
            console.log('Not on detail page - urgency alert will not show');
            return;
        }

        // Check for urgent site codes
        const foundSite = checkForUrgentSite();

        if (foundSite) {
            console.log(`Urgent site detected on detail page: ${foundSite}`);
            setTimeout(() => showUrgencyPopup(foundSite), 800);
        } else {
            console.log('No urgent site code found on this work order');
        }
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndShowPopup);
    } else {
        // Small delay to ensure page content is loaded
        setTimeout(checkAndShowPopup, 1000);
    }

    // Monitor for navigation changes (for single-page apps)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            popupShown = false; // Reset for new page
            setTimeout(checkAndShowPopup, 1000);
        }
    }).observe(document, {subtree: true, childList: true});

})();
