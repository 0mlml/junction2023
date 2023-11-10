// Leave listener, reports to server when user leaves the page
window.addEventListener("beforeunload", () => {
  fetch("/leave", { method: "POST", });
});