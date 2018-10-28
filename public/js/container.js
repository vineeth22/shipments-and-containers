$(document).ready(function () {
  $.ajax({
    url: 'listContainers',
    type: 'GET',
  })
    .done(function (res) {
      document.getElementById("listContainers").innerHTML = JSON.stringify(res, undefined, 2);
    })
    .fail(function (xhr) {
    })


  $("#update").click(function () {
    var containerId = $('#containerId').val();
    var status = $('#status').val();

    var data = {
      containerId,
      status 
       }
    console.log(containerId);

    $.ajax({
      url: 'updateContainerStatus',
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
