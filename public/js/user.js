$(function () {
    $.get(window.location.href + '/data', function (data) {
        var ctx = $('#questionnare_overall').getContext('2d');        
        pam_chart = new Chart(ctx,
            {
                type: 'line',
                data: data.lists
            })
    });
});