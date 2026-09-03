try {
  console.log("typeof localStorage:", typeof localStorage);
  console.log("localStorage:", localStorage);
  localStorage.getItem("test");
} catch(e) {
  console.error("Error accessing localStorage:", e);
}
