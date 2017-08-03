$(function () {
    $.get(window.location.href + '/data', function (data) {
        var ctx = $('#questionnare_overall')[0].getContext('2d');        
        pam_chart = new Chart(ctx,
            {
                type: 'line',
                data: {
                    labels: data.lists.labels,
                    datasets: [{
                        data: data.lists.data,
                        label: "PAM Score"
                    }],
                },
                options: {
                    scales: {
                        yAxes: [{
                            min: 0,
                            max: 52
                        }]
                    }
                }
            })
    });
});