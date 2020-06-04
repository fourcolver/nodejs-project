//jshint esversion:8

$("#radioDifferentBillingAddressYes").click(function () {
  $("#differentBillingAddress").fadeIn(500);
});

$("#radioDifferentBillingAddressNo").click(function () {
  $("#differentBillingAddress").fadeOut(500);
});

window.onload = function () {
  if ($("#radioDifferentBillingAddressYes").is(":checked")) {
    $("#differentBillingAddress").show();
  } else {
    $("#differentBillingAddress").hide();
  }
};


// Datatable initialization
$(document).ready(function () {

  //after click upload file button
  $('#file-upload').on('change', function(){
    var inputs = this.files;
    for (let i=0; i<inputs.length; i++) {
      var file_info = `<p class='file-info'>${inputs[i].name}</p>`;
      $("#file-upload-fileinfo").append(file_info);
    }
    $('.upload-content').removeClass('d-none');
  });

  var form_original_data = $("#eventForm").serialize();

  $.fn.dataTable.moment('DD.MM.YYYY');
  // $("#eventTable").DataTable({});
  var eventtable = $("#eventTable").DataTable({
    bAutoWidth: false,
    dom: "ftiB",
    columns: [
      null,
      null,
      null,
      null,
      {
        orderable: false
      },
      {
        orderable: false
      },
      {
        orderable: false
      }
    ],
    buttons: [{
      extend: 'copy',
      text: 'Tabelle kopieren'
    },
    {
      extend: 'excel',
      text: 'Excel-Export'
    }
    ],
    paging: false,
    responsive: true,
    language: {
      "url": "//cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/German.json"
    }
  });

  //uploaded file table

  var uploadTable = $("#upload_table").DataTable({
    bAutoWidth: false,
    columns: [
      null,
      {
        orderable: false
      },
      {
        orderable: false
      }
    ],
    paging: false,
    responsive: true,
    language: {
      "url": "//cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/German.json"
    }
  });

  $('#bandselect').on('change', function () {
    var bandtype = this.value;
    $('#bandtype').val(bandtype);
    $.ajax({
      url: 'bandselect',
      type: 'POST',
      data: {
        "bandtype": bandtype
      },
      success: async function (res) {
        eventtable.clear().draw();
        let data = res.senddata;

        for (let i = 0; i < data.length; i++) {
          eventtable.rows.add([data[i]]);
          eventtable.columns.adjust().draw();
        }
      }
    });
  });

  var membertable = $("#bandTable").DataTable({
    bAutoWidth: false,
    dom: "ftiB",
    columns: [
      null,
      null,
      {
        orderable: false
      },
    ],
    buttons: [{
      extend: 'copy',
      text: 'Tabelle kopieren'
    },
    {
      extend: 'excel',
      text: 'Excel-Export'
    }
    ],
    paging: false,
    responsive: true,
    language: {
      "url": "//cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/German.json"
    }
  });

  var membertable = $("#eventChangeTable").DataTable({
    bAutoWidth: false,
    // dom: "ftiB",
    columns: [
      null,
      null,
      null,
      null,
    ],
    buttons: [{
      extend: 'copy',
      text: 'Tabelle kopieren'
    },
    {
      extend: 'excel',
      text: 'Excel-Export'
    }
    ],
    // paging: false,
    responsive: true,
    language: {
      "url": "//cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/German.json"
    }
  });


  $('#saveEvent').on('click', function () {
    var form_original_data_new = $("#eventForm").serialize();
    if (form_original_data_new == form_original_data) {
      var ischanged = false;
    }
    else {
      var ischanged = true;
    }
    $("#eventForm").on("submit", function (event) {
      event.preventDefault();
      $.ajax({
        url: '/save',
        type: 'POST',
        data: `${form_original_data_new}&ischanged=${ischanged}`,
        success: function (res) {
          if(res.status) {
            window.location.href = '/';
          }
        }
      });
    });
  });

  $('#banddata').on('change', function () {
    var bandtype = this.value;
    $('#changeband').val(bandtype);
    $('#beforeband').val(bandtype);
    $('#beforeband_invoice').val(bandtype);
    $('#beforeband_contract').val(bandtype);
    $('#modalband').val(bandtype);
    $.ajax({
      url: 'bandselectwithmember',
      type: 'POST',
      data: {
        "bandtype": bandtype
      },
      success: async function (res) {
        membertable.clear().draw();
        let data = res.senddata;
        let bandinfo = res.bandinfo;
        $('#invoiceChange').val(bandinfo.invoice);
        $('#contractChange').val(bandinfo.contract);
        for (let i = 0; i < data.length; i++) {
          membertable.rows.add([data[i]]);
          membertable.columns.adjust().draw();
        }
      }
    });
  });

});

function deleteFile(name, id, dbname) {
  $.ajax({
    url: '/deleteFiles',
    type: 'POST',
    data: {
      "name": name,
      "id": id,
      "dbname": dbname
    },
    success: async function (res) {
      if(res.status == 'success') {
        window.location.reload();
      }
    }
  });
}

function deleteEvent(id) {
  swal({
    title: "Bestätigung",
    text: "Möchten Sie diese Veranstaltung wirklich unwiderruflich löschen?",
    icon: "warning",
    buttons: true,
    dangerMode: true,
  })
    .then((willDelete) => {
      if (willDelete) {
        $('#loading').removeClass('d-none');
        $.ajax({
          url: 'delete',
          method: 'POST',
          data: {
            id
          }
        })
          .done(function (res) {
            $('#loading').addClass('d-none');

            swal({
              title: "Erfolgreich",
              text: "Veranstaltung erfolgreich gelöscht.",
              icon: "success",
              button: "OK",
            }).then((ok) => {
              if (ok) {
                location.reload();
              }
            });
          });
      } else {
        swal("Löschen abgebrochen!");
      }
    });
}

function deleteMember(id) {
  swal({
    title: "Confirm",
    text: "Are you sure to delete this Item?",
    icon: "warning",
    buttons: true,
    dangerMode: true,
  })
    .then((willDelete) => {
      if (willDelete) {
        $('#loading').removeClass('d-none');
        $.ajax({
          url: 'deletemember',
          method: 'POST',
          data: {
            id
          }
        })
          .done(function (res) {
            $('#loading').addClass('d-none');

            swal({
              title: "Success",
              text: "Deleted successfully.",
              icon: "success",
              button: "OK",
            }).then((ok) => {
              if (ok) {
                location.reload();
              }
            });
          });
      } else {
        swal("Delete is canceled!");
      }
    });
}

function createInvoice() {
  var invoiceInput = $('#invoice').val();
  var swalField = document.createElement('input');
  swalField.setAttribute("placeholder", "Rechnungsnummer");
  swalField.setAttribute("type", "number");
  swalField.setAttribute("class", "swal-content__input");
  swalField.setAttribute("value", invoiceInput);
  swal({
    text: 'Wählen Sie \"Rechnung\", um die Rechnung mit der angegebenen Rechnungsnummer final zu erstellen. \n\nWählen Sie "Vorschau", um die Rechnung ohne endgültige Vergabe einer Rechnungsnummer zu überprüfen.',
    content: swalField,
    buttons: {
      cancel: "Abbrechen",
      preview: "Vorschau",
      create: "Rechnung"
    }
  })
    .then((value) => {
      switch (value) {

        case "preview":
          var id = swalField.value;
          $('#invoice').val(id);
          $('#eventForm').attr('action', "/invoicePreview").submit();
          break;

        case "create":
          id = swalField.value;
          if (id) {
            $('#invoice').val(id);
            $('#eventForm').attr('action', "/invoice").submit();
            setTimeout(() => {
              location.reload();
            }, 1000);
          }
          else {
            swal({
              title: "Fehler",
              text: "Bitte geben Sie eine gültige Rechnungsnummer ein!",
              icon: "error",
              button: "OK",
            });
          }
          break;

        default:
        //do nothing (modal will be closed)
      }
    }
    )
    .catch(err => {
      if (err) {
        swal("Damn!", "Das hat leider nicht funktioniert!", "error");
      } else {
        swal.stopLoading();
        swal.close();
      }
    });
}

function sendInfomail(event)
{
    window.location.href =  "mailto:?subject=Infos " + $('#bandtype').val() + " @ " + $('#eventCity').val() +"&body=Hallo zusammen,%0D%0A%0D%0Ahier die Infos zum nächsten Gig: %0D%0A%0D%0A" +
                            "Anlass:" + "%0D%0A" + "----------" + "%0D%0A" +
                            $('#eventName').val() + "%0D%0A%0D%0A%0D%0A" +
                            "Adresse:" + "%0D%0A" + "-------------" + "%0D%0A" +
                            $('#eventStreetAndHouseNumber').val() + "%0D%0A" +
                            $('#eventZip').val() + " " + $('#eventCity').val() + "%0D%0A%0D%0A%0D%0A" +
                            "Spielzeit:" + "%0D%0A" + "------------" + "%0D%0A" +
                            $('#showtimeStart').val() + " - " + $('#showtimeEnd').val() + "%0D%0A%0D%0A%0D%0A" +
                            "Einlass:" + "%0D%0A" + "-----------" + "%0D%0A" +
                            "%0D%0A%0D%0A%0D%0A" +
                            "Soundcheck:" + "%0D%0A" + "------------------" + "%0D%0A" +
                            "%0D%0A%0D%0A%0D%0A" +
                            "Dresscode:" + "%0D%0A" + "---------------" + "%0D%0A" +
                            "%0D%0A%0D%0A%0D%0A" +
                            "Abfahrt:" + "%0D%0A" + "-------------" + "%0D%0A" +
                            "%0D%0A%0D%0A%0D%0A" +
                            "Ansprechpartner vor Ort:" + "%0D%0A" + "-----------------------------------" + "%0D%0A" +
                            $('#contactName').val() + "%0D%0A" +
                            "Tel.: " + $('#contactPhone').val() + "%0D%0A" +
                            "%0D%0A%0D%0A%0D%0A" +
                            "Helfer:" + "%0D%0A" + "-------------";
}
