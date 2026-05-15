// popup.js
document.addEventListener("DOMContentLoaded", function () {
  // Handle all links with target="_blank" to open in new tab
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      chrome.tabs.create({ url: this.href });
    });
  });

  // Handle clear edits button
  const clearBtn = document.getElementById("clear-edits-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all saved edits? This cannot be undone.")) {
        chrome.storage.local.remove(["nsu-cgpa-edits"], () => {
          alert("All saved edits have been cleared!");
          clearBtn.textContent = "Edits Cleared!";
          clearBtn.disabled = true;
          setTimeout(() => {
            clearBtn.textContent = "Clear All Saved Edits";
            clearBtn.disabled = false;
          }, 2000);
        });
      }
    });
  }
});

