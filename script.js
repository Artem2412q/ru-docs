document.querySelectorAll(".bounty-target-card").forEach(card=>{
 card.addEventListener("click",e=>{
  e.stopPropagation();
  document.querySelectorAll(".bounty-target-card").forEach(c=>c.classList.remove("bounty-selected"));
  card.classList.add("bounty-selected");
 });
});