$(document).ready(function () {
  $(".contact-container").hide();
  // $(".account-container").hide();
  $(".opportunity-container").hide();
  $(".delete-contact").hide();
  $(".modal").hide();

  // On Widget Pageload
  ZOHO.embeddedApp.on("PageLoad", async (data) => {
    var contactList = [];
    var idCounter = 1000;
    var contactAddedSuccesfully = false;
    var contactCreationError;
    var primaryID;
    var createdID;
    var primaryContactSelected = false;
    var date = new Date();
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();

    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;

    var today = year + "-" + month + "-" + day;

    document.getElementById("opportunity_date").value = today;

    // get platforms for account picklist
    // Get Organization Info
    var orgInfo = await ZOHO.CRM.CONFIG.getOrgInfo();
    // Get Current User Info
    var userInfo = await ZOHO.CRM.CONFIG.getCurrentUser();
    console.log(userInfo);

    var user_name = userInfo.users[0].full_name

    ZOHO.CRM.API.getAllRecords({ Entity: "Platforms" }).then((resp) => {
      let platforms = resp.data;

      platforms.forEach((platform) => {
        $("#platforms").append(new Option(platform.Name, platform.id));
        if(platform.Name == user_name){
          $("#platforms").val(platform.id)
        }
        
      })
      
        

    
    });
    $("#platforms").select2();

    // Add Type for Opportunity
    ZOHO.CRM.META.getFields({ Entity: "Deals" }).then(function (data) {
      // console.log(data)
      //  Add Type

      let fields = data.fields;

      fields.forEach((field) => {
        let options = field.pick_list_values;
        if (field.api_name == "Type") {
          options.forEach((option) => {
            $("#opportunity_type").append(
              new Option(option.display_value, option.display_value)
            );
          });
        }

        if (field.api_name == "Stage") {
          options.forEach((option) => {
            console.log(option)
            $("#opportunity_stage").append(
              new Option(option.display_value, option.display_value)
            );
          });
        }
      });
    
    });
    // Add Type for Account
    ZOHO.CRM.META.getFields({ Entity: "Accounts" }).then(function (data) {
      // console.log(data)
      //  Add Type
      let fields = data.fields;
      fields.forEach((field) => {
        let pick_list_values = field.pick_list_values;

        if (field.api_name == "Account_Type") {
          pick_list_values.forEach((value) => {
            $("#account_type").append(
              new Option(value.display_value, value.display_value)
            );
          });
        }
        if (field.api_name == "Lead_Source") {
          pick_list_values.forEach((option) => {
            $("#lead_source").append(
              new Option(option.display_value, option.display_value)
            );
          });
        }
      });
    });

    // Resize Widget
    ZOHO.CRM.UI.Resize({ height: "87%", width: "90%" });

    // Load Data Function
    var loadData = async () => {
      let metricsData = {
        req: "ac_create_account",
        user_id: null,
        org_id: null,
        zoho_record_id: null,
        button_id: null,
        username: null,
        org_name: null,
        timestamp: null,
        api_response_message: null,
        api_response_status: null,
        parent: true,
      };
      // User ID
      metricsData.user_id = userInfo.users[0].id;
      // Organiztion ID
      metricsData.org_id = orgInfo.org[0].id;
      // User Name
      metricsData.username = userInfo.users[0].full_name;
      // Organization Name
      metricsData.org_name = orgInfo.org[0].company_name;
      // Zoho Record ID
      metricsData.zoho_record_id = data.EntityId[0];

      return metricsData;
    };

    //Send Data to API Gateway
    var send = async (metricsData, button_id) => {
      // console.log(metricsData)
      // Button ID
      metricsData.button_id = button_id;
      // Timestamp
      metricsData.timestamp = new Date().toLocaleString().replace(",", "");
      // Ajax XMLHttpRequest Settings
      var settings = {
        url: "https://5vyt2lx3sc.execute-api.us-east-1.amazonaws.com/Beta/databaseFunction",
        method: "POST",
        data: JSON.stringify(metricsData),
      };
      var resp;
      await $.ajax(settings).done(function (response) {
        resp = response;
      });
      return resp;
    };
    // Have metricsData wait for loadData to finish
    var metricsData = await loadData();
    // Send Page Load Front End Analytics
    await send(metricsData, "AC-CA");
    // Hide

    var billing_street,
      mailing_state,
      mailing_city,
      mailing_code,
      phone_number,
      email;

    // Create Account Button Click Function
    $(".create-account-btn").click(async function () {
      if (
        $("#acc_name").val() == "" ||
        $("#acc_name").val() == null ||
        $("#acc_name").val() == undefined
      ) {
        // console.log("error")
        notification("error", "Please enter account name.");
        return;
      }

      // Store input fields in these variables
      billing_street = $("#acc_street").val();
      mailing_state = $("#acc_state").val();
      mailing_city = $("#acc_city").val();
      mailing_code = $("#acc_code").val();
      phone_number = $("#acc_phone").val();
      email = $("#acc_email").val();

      // Account Data Object
      let accountData = {
        Account_Name: $("#acc_name").val(),
        Phone: $("#acc_phone").val(),
        Preferred_Language: $("#preferred_language").val(),
        Billing_City: $("#acc_city").val(),
        State: $("#acc_state").val(),
        Billing_Code: $("#acc_zipcode").val(),
        Email: $("#acc_email").val(),
        Billing_Street: $("#acc_street").val(),
        Account_Type: $("#account_type").val(),
        Lead_Source: $("#lead_source").val(),
        Membership_Status: "Prospect",
      };

      try {
        let resp = await ZOHO.CRM.API.insertRecord({
          Entity: "Accounts",
          APIData: accountData,
        });
        createdID = resp.data[0].details.id;
        console.log($("#platforms").val());
        let selected_platforms = $("#platforms").val();
        selected_platforms.forEach(async (platform) => {
          await ZOHO.CRM.API.insertRecord({
            Entity: "Platform_Percentage",
            APIData: {
              Platforms: platform,
              Agencies: createdID,
            },
          });
        });

        var parentResp = await send(metricsData, "AC-CA-1");
        metricsData.id = parentResp.queryResponse.rows[0].id;
        // Switch to false to send to Child Table
        metricsData.parent = false;
        // API Response Message
        metricsData.api_response_message = resp.data[0].message;
        // API Response Status
        metricsData.api_response_status = resp.data[0].status;
        // Send API Response Data to Child Table
        await send(metricsData);

        $(".account-container").addClass("animate__fadeOutLeft");
        $(".contact-container").addClass("animate__fadeInRight");
        $(".contact-container").show();
        notification("success", "Account Created.");
      } catch (e) {
        // console.log(e)
        notification("error", `Error Occured.`);
        // API Response Message
        metricsData.api_response_message = e.data[0].message;
        // API Response Status
        metricsData.api_response_status = e.data[0].status;
        // Send API Response Data to Child Table
        await send(metricsData, "AC-CA-1");
      }
    });

    // Close Modal Click Function
    $(".modal-close").click(function () {
      $(".modal").fadeOut();
    });

    function contactIsBlank() {
      if (
        // $("#acc_name").val() &&
      
        $("#contact_lname").val() 
    
      ) {
        return false;
      } else {
        return true;
      }
    }
    // Primary Contact Click Function
    $(".primary_contact_img").click(function () {
      if ($(this).hasClass("on")) {
        $(this).removeClass("on");
        $(this).addClass("off");
        $(this).attr(
          "src",
          "https://siegetechnology.company/Create-Account/Assets/star.svg"
        );
      } else if ($(this).hasClass("off")) {
        $(this).removeClass("off");
        $(this).addClass("on");
        $(this).attr(
          "src",
          "https://siegetechnology.company/Create-Account/Assets/fill-star.svg"
        );
        primaryContactSelected = false;
      }
    });

    // Add Contact Button Click Function
    $(".add-contact").click(function () {
      $(".add-contact-btn-1").attr(
        "src",
        "https://siegetechnology.company/Create-Account/Assets/add.svg"
      );
      // checks if contact already exists using email
      if (contactBeingModified != null) {
        contactList.forEach((contact) => {
          if (contact.id == contactBeingModified) {
            contact.Account_Name = $("#acc_name").val();
            contact.First_Name = $("#contact_fname").val();
            contact.Last_Name = $("#contact_lname").val();
            contact.Email = $("#contact_email").val();
            contact.Phone = $("#contact_number").val();
            contact.Mailing_Street = $("#contact_street").val();
            contact.State = $("#contact_state").val();
            contact.Mailing_City = $("#contact_city").val();
            contact.Mailing_Zip = $("#contact_zip_code").val();
            contact.Primary = $(".primary_contact_img").hasClass("on");
            contact.siegeams__Preferred_Language = $(
              "#preferred_language"
            ).val();
            $("#addContactBtn").text("Add");
            $("#contact_fname").val("");
            $("#contact_lname").val("");
            $("#contact_email").val("");
            $("#contact_number").val("");
            $("#contact_street").val("");
            $("#contact_state").val("");
            $("#contact_city").val("");
            $("#contact_zip_code").val("");
            $("#contact_primary").prop("checked", false);
            $("#use_account_address").prop("checked", false);
            $("#use_account_phone_number").prop("checked", false);
            $("#use_account_email").prop("checked", false);
            $(".create-contacts-btn").fadeIn();
            if ($(".primary_contact_img").hasClass("on")) {
              primaryContactSelected = true;
              primaryID = contact.id;
              $("#contact_primary").prop("disabled", true);
              $(".primary_contact_img").removeClass("on");
              $(".primary_contact_img").addClass("off");
              $(".primary_contact_img").attr(
                "src",
                "https://siegetechnology.company/Create-Account/Assets/star.svg"
              );
              $(".primary-contact-div").addClass("animate__fadeOutLeft");
            }
            contactBeingModified = null;
          }
        });
      } else {
        let contactExists = contactList.find(
          (obj) => obj.Email === $("#contact_email").val()
        );
        if (contactExists != undefined) {
          // console.log(contactExists);
          notification(
            "error",
            `${contactExists.First_Name} Has the same email. Please change email before continuing.`
          );
          return;
        }
        $(".delete-contact").addClass("animate__fadeInDown");
        // check if fields are filled
        if (contactIsBlank()) {
          notification("error", "Make sure all fields are filled");
          return;
        }
        var temp = {};
        // add fields to list
        temp.id = idCounter;
        temp.Account_Name = $("#acc_name").val();
        temp.First_Name = $("#contact_fname").val();
        temp.Last_Name = $("#contact_lname").val();
        temp.Email = $("#contact_email").val();
        temp.Phone = $("#contact_number").val();
        temp.Mailing_Street = $("#contact_street").val();
        temp.Mailing_State = $("#contact_state").val();
        temp.Mailing_City = $("#contact_city").val();
        temp.Mailing_Zip = $("#contact_zip_code").val();
        temp.Primary = $(".primary_contact_img").hasClass("on");
        temp.siegeams__Preferred_Language = $("#preferred_language").val();

        contactList.push(temp);
        // console.log(temp)

        if ($(".primary_contact_img").hasClass("on")) {
          primaryContactSelected = true;
          primaryID = temp.id;
          $("#contact_primary").prop("disabled", true);
          $(".primary_contact_img").removeClass("on");
          $(".primary_contact_img").addClass("off");
          $(".primary_contact_img").attr(
            "src",
            "https://siegetechnology.company/Create-Account/Assets/star.svg"
          );
          $(".primary-contact-div").addClass("animate__fadeOutLeft");

          $(".contact-lists").append(`
          <div class="contact-item flexed f-center primary-contact primary" id="${temp.id}"> <p>${temp.First_Name}</p> <img src="https://siegetechnology.company/Create-Account/Assets/close1.svg" id='delete_${temp.id}' class='delete-contact'/> </div>
          `);
        } else if ($(".primary_contact_img").hasClass("off")) {
          $(".contact-lists").append(`
          <div class="contact-item flexed f-center" id="${temp.id}"> <p>${temp.First_Name}</p> <img src="https://siegetechnology.company/Create-Account/Assets/close1.svg" id='delete_${temp.id}' class='delete-contact'/></div>
          `);
        }
        idCounter++;
        $("#contact_fname").val("");
        $("#contact_lname").val("");
        $("#contact_email").val("");
        $("#contact_number").val("");
        $("#contact_street").val("");
        $("#contact_state").val("");
        $("#contact_city").val("");
        $("#contact_zip_code").val("");
        $("#contact_primary").prop("checked", false);
        $("#use_account_address").prop("checked", false);
        $("#use_account_phone_number").prop("checked", false);
        $("#use_account_email").prop("checked", false);
      }
    }); // End of Add Contact Button Click

    $("body").on("click", ".delete-contact", function () {
      $(".add-contact-btn-1").attr(
        "src",
        "https://siegetechnology.company/Create-Account/Assets/add.svg"
      );
      var id = $(this).attr("id").split("_")[1];
      // console.log(id);
      // console.log('test');

      if ($(`#${id}`).hasClass("primary")) {
        // console.log("IS PRIMARY");
        primaryContactSelected = false;
        $(".primary-contact-div").removeClass("animate__fadeOutLeft");
        $(".primary-contact-div").addClass("animate__fadeInLeft");
        $(".primary-contact-div").show();
      }
      contactList = $.grep(contactList, function (object) {
        return object.id != id;
      });

      // console.log(contactList);
      $(`#${id}`).remove();
      contactBeingModified = null;

      $(".create-contacts-btn").fadeIn();
      $("#addContactBtn").text("Add");
    });
    var primaryLanguage;
    // Create Contacts Button Click Function
    $(".create-contacts-btn").click(async function () {
      contactCreationError = false;
      if (
        contactList.length == 0 &&
        contactIsBlank() &&
        !contactAddedSuccesfully
      ) {
        notification("error", "Please enter last name");
        return;
      }
      if (contactList.length == 0 && !contactIsBlank()) {
        turnOnPotential();
        $(".add-contact").click();
      } else if (contactList.length > 0 && !contactIsBlank()) {
        $(".add-contact").click();
      } else if (
        contactIsBlank() &&
        contactAddedSuccesfully == true &&
        primaryContactSelected == true
      ) {
        $(".contact-container").addClass("animate__fadeOutLeft");
        $(".opportunity-container").addClass("animate__fadeInRight");
        $(".opportunity-container").show();
      }
      if (contactList.length == 1) {
        contactList[0].Primary = true;
        primaryContactSelected = true;
      }

      if (primaryContactSelected == false) {
        notification("error", "No contacts selected as Primary Contact");
        return;
      }

      var primaryObject = contactList.filter((obj) => {
        return obj.Primary == true;
      });
      // Checks if email is in the system
      for (var i = 0; i < contactList.legnth; i++) {
        var CEMail = contactList[i].First_Name;
        await ZOHO.CRM.API.searchRecord({
          Entity: "Contacts",
          Type: "criteria",
          Query: `((Email:equals:${contactList[i].Email}))`,
        }).then(function (data) {
          // console.log(data);
          if (data.statusText != "nocontent") {
            // console.log(data.data)
            // console.log(data.data[0].Email);

            // Error Notification
            notification(
              "error",
              `${data.data[0].Email} already exists within CRM. Please change contact email for ${CEMail}.`
            );
            contactCreationError = true;
          }
        });
      }

      // if (contactCreationError = true){
      //     console.log("ERROR OCCURRED")
      //     return;
      // }
      for (var i = 0; i < contactList.length; i++) {
        let uploadData = {
          Account_Name: contactList[i].Account_Name,

          Last_Name: contactList[i].Last_Name,
          First_Name: contactList[i].First_Name,
          Email: contactList[i].Email,
          Mailing_Street: contactList[i].Mailing_Street,
          Mailing_State: contactList[i].Mailing_State,
          Mailing_Zip: contactList[i].Mailing_Zip,
          Mailing_City: contactList[i].Mailing_City,
          Phone: contactList[i].Phone,
          siegeams__Preferred_Language:
            contactList[i].siegeams__Preferred_Language,
        };
        try {
          let resp2 = await ZOHO.CRM.API.insertRecord({
            Entity: "Contacts",
            APIData: uploadData,
          });
          response = resp2;
          metricsData.parent = true;
          var parentResp2 = await send(metricsData, "AC-CA-2");
          metricsData.id = parentResp2.queryResponse.rows[0].id;

          // Switch to false to send to Child Table
          metricsData.parent = false;
          // API Response Message
          metricsData.api_response_message = resp2.data[0].message;
          // API Response Status
          metricsData.api_response_status = resp2.data[0].status;
          // Send API Response Data to Child Table
          await send(metricsData);
          if (contactCreationError != true) {
            notification("success", `Contact Created Succesfully`);
          }
          $(`#${contactList[i].id}`).fadeOut();
          contactAddedSuccesfully = true;
        } catch (e) {
          // API Response Message
          console.log(e);
          metricsData.api_response_message = e.data[0].message;
          // API Response Status
          metricsData.api_response_status = e.data[0].status;
          await send(metricsData, "AC-CA-2");
          // If Duplicate Data error
          if (e.data[0].code == "DUPLICATE_DATA") {
            notification(
              "error",
              `Contact ${contactList[i].First_Name} not created. Email already exists.`
            );
          } else {
            notification(
              "error",
              `Internal Error. Please Contact your IT Department`
            );
          }
          contactCreationError = true;
        }

        if (contactList[i].Primary) {
          primaryLanguage = contactList[i].siegeams__Preferred_Language;

          primaryID = response.data[0].details.id;
          let recordData = {
            id: createdID,
            Primary_Contact: response.data[0].details.id,
            Account_Primary_Email: contactList[i].Email,
          };
          // Update Record
          let update = await ZOHO.CRM.API.updateRecord({
            Entity: "Accounts",
            APIData: recordData,
          });

          // console.log(metricsData.id)
          // Switch to false to send to Child Table
          // metricsData.parent = false;
          // metricsData.api_response_message = update.data[0].message;
          // metricsData.api_response_status = update.data[0].status;
          // await send(metricsData)
        }
      }
      $(".contact-container").addClass("animate__fadeOutLeft");
      $(".opportunity-container").addClass("animate__fadeInRight");
      $(".opportunity-container").show();
    });

    $("#use_account_address").change(function () {
      if (this.checked) {
        // console.log("HI");
        $("#contact_street").val($("#acc_street").val());
        $("#contact_city").val($("#acc_city").val());
        $("#contact_state").val($("#acc_state").val());
        $("#contact_zip_code").val($("#acc_zipcode").val());
      } else {
        $("#contact_street").val("");
        $("#contact_city").val("");
        $("#contact_state").val("");
        $("#contact_zip_code").val("");
      }
    });

    $("#use_account_phone_number").change(function () {
      if (this.checked) {
        $("#contact_number").val($("#acc_phone").val());
      } else {
        $("#contact_number").val("");
      }
    });

    $("#use_account_email").change(function () {
      if (this.checked) {
        // console.log("CHECKED");
        // // console.log($("#acc_email").val());
        $("#contact_email").val($("#acc_email").val());
      } else {
        $("#contact_email").val("");
      }
    });

    $(".user-account-info-btn").click(function () {
      $("#contact_street").val($("#acc_street").val());
      $("#contact_city").val($("#acc_city").val());
      $("#contact_state").val($("#acc_state").val());
      $("#contact_zip_code").val($("#acc_zipcode").val());
      $("#contact_number").val($("#acc_phone").val());
      $("#contact_email").val($("#acc_email").val());
    });

    var contactBeingModified;
    // On click of green box containing contact info
    $("body").on("click", ".contact-item", function () {
      contactList.forEach((contact) => {
        if (contact.id == $(this).attr("id")) {
          contactBeingModified = contact.id;
          $("#contact_fname").val(contact.First_Name);
          $("#contact_lname").val(contact.Last_Name);
          $("#contact_email").val(contact.Email);
          $("#contact_number").val(contact.Phone);
          $("#contact_street").val(contact.Mailing_Street);
          $("#contact_state").val(contact.Mailing_State);
          $("#contact_city").val(contact.Mailing_City);
          $("#contact_zip_code").val(contact.Mailing_Zip);
          if (contact.Primary) {
            $(".primary_contact_img").show();
            $(".primary_contact_img").hasClass("on");
          }
          $("#preferred_language").val(contact.siegeams__Preferred_Language);
          $("#addContactBtn").text("Update");
          $(".add-contact-btn-1").attr(
            "src",
            "https://siegetechnology.company/Create-Account/Assets/update.svg"
          );

          $(".create-contacts-btn").fadeOut();
          if (contact.Primary) {
            $(".primary-contact-div").removeClass("animate__fadeOutLeft");

            $(".primary-contact-div").addClass("animate__fadeInLeft");
            $(".primary_contact_img").click();
            $(".primary-contact-div").show();
          }
        }
      });
    });

    function notification(type, message) {
      switch (type) {
        case "success":
          $(".modal").removeClass("animate__fadeOutRight");
          $(".modal").removeClass("warning-modal");
          $(".modal").removeClass("error-modal");
          $(".modal").addClass("success-modal");
          $(".modal-img").attr(
            "src",
            "https://siegetechnology.company/Create-Account/Assets/succes_modal_icon.svg"
          );
          $(".modal-message").text(message);
          $(".modal").animate({ right: 50, opacity: "show" }, 1500);
          setTimeout(function () {
            $(".modal").addClass("animate__fadeOutRight");
          }, 2000);
          break;
        case "warning":
          $(".modal").removeClass("success-modal");
          $(".modal").removeClass("error-modal");
          $(".modal").addClass("warning-modal");
          $(".modal-img").attr(
            "src",
            "https://siegetechnology.company/Create-Account/Assets/succes_modal_icon.svg"
          );
          $(".modal-message").text(message);
          $(".modal").animate({ right: 50, opacity: "show" }, 1500);
          setTimeout(function () {
            $(".modal").addClass("animate__fadeOutRight");
          }, 2000);
          break;
        case "error":
          $(".modal").removeClass("animate__fadeOutRight");
          $(".modal").removeClass("warning-modal");
          $(".modal").removeClass("success-modal");
          $(".modal").addClass("error-modal");
          $(".modal-img").attr(
            "src",
            "https://siegetechnology.company/Create-Account/Assets/error_modal_icon.svg"
          );
          $(".modal-message").text(message);
          $(".modal").animate({ right: 50, opacity: "show" }, 1500);
          // setTimeout(function () {
          //   $(".modal").addClass("animate__fadeOutRight");
          // }, 10000);
          break;
      }
    }

    var turnOnPotential = () => {
      $(".primary_contact_img").removeClass("off");
      $(".primary_contact_img").addClass("on");
      $(".primary_contact_img").attr(
        "src",
        "https://siegetechnology.company/Create-Account/Assets/fill-star.svg"
      );
    };

    // Create Opportunity Click Function
    var skipOpp = true;
    $(".create-opportunity-btn").click(async function () {
      if (!skipOpp) {
        if ($("#opportunity_type").val() == "-None-") {
          notification("error", "Please select an Opportunity Type");
          return;
        }
        // if ($("#opportunity_leadsource").val() == "-None-") {
        //     notification("error", "Please select an Opportunity Lead Source");
        //     return;
        // }
        if ($("#opportunity_stage").val() == "-None-") {
          notification("error", "Please select an Opportunity Stage");
          return;
        }

        if (
          $("#opportunity_name").val() == "" ||
          $("#opportunity_name").val() == "" ||
          $("#opportunity_name").val() == null ||
          $("#opportunity_name").val() == undefined
        ) {
          notification("error", "Please enter opportunity name.");
          return;
        }

        // Create upload data object and upload opportunity using crm API
        let uploadData = {
          Account_Name: createdID,
          Contact_Name: primaryID,
          Deal_Name: $("#opportunity_name").val(),
          Type: $("#opportunity_type").val(),
          Closing_Date: $("#opportunity_date").val(),
          Stage: $("#opportunity_stage").val(),
          Street:$("#acc_street").val(),
          City:$("#acc_city").val(),
          State:$("#acc_state").val(),
          Zip:$("#acc_zipcode").val()

        };

        try {
          console.log(uploadData)
          let resp3 = await ZOHO.CRM.API.insertRecord({
            Entity: "Deals",
            APIData: uploadData,
          });
          console.log($("#opportunity_stage").val())
          console.log($("#opportunity_stage"))
          if ($("#opportunity_stage").val() == "Closed Won") {
            let acc_update_resp = await ZOHO.CRM.API.updateRecord({
              Entity: "Accounts",
              APIData: {
                id: createdID,
                Account_Type: "Member",
                Membership_Status: "Active",
                Collective_Join_Date: $("#opportunity_date").val(),
              },
            });
            console.log(acc_update_resp);
          }
          metricsData.parent = true;
          let opp_id = resp3.data[0].details.id;
          var parentResp3 = await send(metricsData, "AC-CA-3");
          metricsData.id = parentResp3.queryResponse.rows[0].id;
          // Switch to false to send to Child Table
          metricsData.parent = false;
          // API Response Message
          metricsData.api_response_message = resp3.data[0].message;
          // API Resposne Status
          metricsData.api_response_status = resp3.data[0].status;
          // Send API Response Data to Child Table
          await send(metricsData);
          // $(".opportunity-container").hide();
          // $(".footer-logo").hide();
          notification("success", "Opportunity Created.");
          // Open Created Opportunity
          await ZOHO.CRM.UI.Record.open({
            Entity: "Deals",
            RecordID: opp_id,
          });
        } catch (e) {
          console.log(e)
          // Error Notification
          notification("error", `Error Occured.`);
          // API Response Message
          metricsData.api_response_message = e.data[0].message;
          // API Response Status
          metricsData.api_response_status = e.data[0].status;
          await send(metricsData, "AC-CA-3");
          return;
        }
      } else {
        await ZOHO.CRM.UI.Record.open({
          Entity: "Accounts",
          RecordID: createdID,
        });
      }
    });
    $(".opportunity-input").on("keyup", function () {
      if ($("#opportunity_name").val() != "") {
        skipOpp = false;

        $("#opp-btn-txt").text("Confirm");
      } else {
        skipOpp = true;
        $("#opp-btn-txt").text("Skip");
      }
    });
  });
  ZOHO.embeddedApp.init();
});
