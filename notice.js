document.addEventListener("DOMContentLoaded", () => {


  /*
    Notification Filters
  */

  const tabs = document.querySelectorAll(".tab-btn");
  const cards = document.querySelectorAll(".notif-card");


  tabs.forEach(tab => {

    tab.addEventListener("click", () => {


      tabs.forEach(t =>
        t.classList.remove("active")
      );


      tab.classList.add("active");


      const filter =
        tab.getAttribute("data-filter");


      cards.forEach(card => {


        const category =
        card.getAttribute("data-category");


        if(
          filter === "all" ||
          category === filter
        ){

          card.classList.remove("hidden");

        }else{

          card.classList.add("hidden");

        }


      });


    });


  });






  /*
    Quick Reply
  */


  const replyButtons =
  document.querySelectorAll(".reply-toggle-btn");


  replyButtons.forEach(btn => {


    btn.addEventListener("click", e => {


      const card =
      e.target.closest(".notif-card");


      const replyBox =
      card.querySelector(".quick-reply-box");


      if(replyBox){

        replyBox.classList.toggle("active");

      }


    });


  });







  /*
    Like Button
  */


  const likeButtons =
  document.querySelectorAll(".like-btn");


  likeButtons.forEach(btn => {


    btn.addEventListener("click", () => {


      const card =
      btn.closest(".notif-card");


      const counter =
      card.querySelector(".count-num");


      let likes =
      parseInt(counter.textContent);



      if(btn.classList.contains("liked")){


        btn.classList.remove("liked");


        btn.textContent =
        "❤️ إعجاب";


        counter.textContent =
        likes - 1;



      }else{


        btn.classList.add("liked");


        btn.textContent =
        "💖 تم الإعجاب";


        counter.textContent =
        likes + 1;



      }



    });


  });








  /*
    Mark All As Read
  */


  const markBtn =
  document.getElementById("mark-all-btn");


  const unreadCount =
  document.getElementById("unread-count");



  if(markBtn){


    markBtn.addEventListener("click",()=>{


      const unreadCards =
      document.querySelectorAll(
        ".notif-card.unread"
      );


      unreadCards.forEach(card=>{


        card.classList.remove("unread");


        const indicator =
        card.querySelector(
          ".card-side-indicator"
        );


        if(indicator){

          indicator.style.opacity="0";

        }


      });



      if(unreadCount){

        unreadCount.textContent="0";

        unreadCount.style.opacity="0.5";

      }



    });


  }





});