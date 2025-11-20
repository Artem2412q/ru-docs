
document.addEventListener("DOMContentLoaded", init);

function init() {
 setupBountySelection();
 setupTargetStatus();
}

function setupBountySelection() {
 const cards = document.querySelectorAll(".bounty-target-card");
 cards.forEach(card=>{
   card.addEventListener("click", e=>{
     if(e.target.classList.contains("bounty-catch-btn")) return;
     cards.forEach(c=>c.classList.remove("bounty-selected"));
     card.classList.add("bounty-selected");
   });
 });
}

function setupTargetStatus() {
 const buttons = document.querySelectorAll(".bounty-catch-btn");
 buttons.forEach(btn=>{
   const id = btn.dataset.target;
   const statusBlock = document.getElementById("status-"+id);
   const saved = localStorage.getItem("bounty_"+id);

   if(saved==="caught"){
     statusBlock.textContent="Статус: поймана";
     btn.textContent="Пометить как свободная";
   }

   btn.addEventListener("click", e=>{
     e.stopPropagation();
     const caught = localStorage.getItem("bounty_"+id)==="caught";
     if(!caught){
       statusBlock.textContent="Статус: поймана";
       btn.textContent="Пометить как свободная";
       localStorage.setItem("bounty_"+id, "caught");
     } else {
       statusBlock.textContent="Статус: цель на свободе";
       btn.textContent="Отметить как поймана";
       localStorage.setItem("bounty_"+id, "free");
     }
   });
 });
}
