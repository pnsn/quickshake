$(function(){
  var menu = $("#menu");
  
  // menu.hide();
  //Handles the menu modifications for bootstrap
  //TODO: Needs cleaning, there has got to be a better way
  
  menu.addClass("collapse navbar-collapse navbar-right");
  menu.children().addClass("nav navbar-nav");
  $("#menu>ul").children().addClass("dropdown").attr("role","presentation");
  $("#menu>ul>li>ul").addClass("dropdown-menu").attr("role","menu");
  
  var tab = $("#menu>ul>li>a");
  //Go through each menu tab and add dropdown if necessary (has more links below)
  tab.each(function(){
    //Make sure only elements with dropdown info have dropdowns 
    if($(this).siblings(".dropdown-menu").length > 0){
      $(this).addClass("dropdown-toggle");
      
      //Add dropdown chevron
      $(this).append(' <i class="fa fa-chevron-down"></>'); 
    
      $(this).attr({
          "data-toggle": "dropdown",
          role:"button",
          "aria-haspopup":true,
          "aria-expanded":false
       });
    }
  });
  
  //prevent menus from starting in open state
  $("#menu ul li").removeClass("open");
  
  //prevent 3rd depth children from showing intially
  $("#menu .depth-2").children("ul").hide();
  
  // $("#menu>ul.nav").show();
});  