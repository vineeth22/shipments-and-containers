$(document).ready(function () {
  $.ajax({
    url: 'listShipments',
    type: 'GET',
  })
    .done(function (res) {
      document.getElementById("listShipments").innerHTML = JSON.stringify(res, undefined, 2);
    })
    .fail(function (xhr) {
    })


  $("#create").click(function () {
    var weight = parseInt($('#weight').val());
    var volume = parseInt($('#volume').val());

    var data = {
      weight,
      volume
    }

    $.ajax({
      url: 'createShipment',
      data: JSON.stringify(data),
      type: 'POST',
      contentType: 'application/json; charset=UTF-8'
    })
      .done(function (res) {
        console.log(res);
      })
      .fail(function (xhr) {
      })
  });

  $("#delete").click(function () {
    var shipmentId = $('#shipmentId').val();

    var data = {
      shipmentId
    }

    $.ajax({
      url: 'deleteShipment',
      data: JSON.stringify(data),
      type: 'POST',
      contentType: 'application/json; charset=UTF-8'
    })
      .done(function (res) {
        console.log(res);
      })
      .fail(function (xhr) {
      })
  });
});
