/*
Name: David Chang, Edmond Niu, Alex Postovskiy, Andrew Somers
Course: CSE
Assignment: CSE Capstone Project
Purpose: Js to create a card in html, used on demos.html
*/

var count = 0;

function callAddCardDefault(){
    inputted_card_image = "img/leaf.jpg";
    inputted_card_title = "Card Title";
    inputted_card_content = "I am a very simple card. I am good at containing small bits of information.I am convenient because I require little markup to use effectively.";
    inputted_card_action = "This is a link";

    addCard(inputted_card_image, inputted_card_title, inputted_card_content, inputted_card_action);
}

function addCard(inputted_card_image, inputted_card_title, inputted_card_content, inputted_card_action, inputted_card_action_link){
    
    var inputted_card_image;
    var inputted_card_title;
    var inputted_card_content;
    var inputted_card_action;

    
    

    var card = document.createElement("div");
    card.classList.add("card", "hoverable");
    
   

    var card_image = document.createElement("div");
    card_image.classList.add("card-image" , "blue-grey");

    image_tag = document.createElement("img");
    image_tag.src = inputted_card_image;

    title_tag = document.createElement("span");
    title_tag.classList.add("card-title", "black-text");
    title_tag.innerText = inputted_card_title;

    var card_content = document.createElement("div");
    card_content.classList.add("card-content", "blue-grey",  "darken-2");

    p_tag = document.createElement("p");
    p_tag.classList.add("orange-text");
    p_tag.innerText = inputted_card_content;


    var card_action = document.createElement("div");
    card_action.classList.add("card-action", "blue-grey",  "darken-1");

    a_tag = document.createElement("a");
    a_tag.href = inputted_card_action_link;
    a_tag.innerText = inputted_card_action;

    card_image.appendChild(image_tag);
    card_image.appendChild(title_tag);

    card_content.appendChild(p_tag);

    card_action.appendChild(a_tag);

    card.appendChild(card_image);
    card.appendChild(card_content);
    card.appendChild(card_action);

    

    count = count + 1;
    if (count == 5){
        count = 1;
    }

    if (count == 1){
        card_spot = document.getElementById("card_spot_1")
    }
    else if (count == 2){
        card_spot = document.getElementById("card_spot_2")
    }
    else if (count == 3){
        card_spot = document.getElementById("card_spot_3")
    }
    else if (count == 4){
        card_spot = document.getElementById("card_spot_4")
    }
    
    card_spot.appendChild(card);
    

    
}

addCard("img/leaf.jpg",  
        "Cool Card Title", 
        "I am a very cool card. Look at all this cool text ",  
        "This is a cool link", "index.html");

for (i = 0; i < 3; i++) {
    addCard("img/leaf.jpg",  
        "", 
        "I am a very cool card. Look at all this cool text ",  
        "Play around with this demo!", "index.html?inputfield=" + i * 18);
    }