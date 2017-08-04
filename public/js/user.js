$(function () {
    $.get(window.location.href + '/data', function (data) {
        var ctx = $('#questionnare_overall')[0].getContext('2d');        
        pam_chart = new Chart(ctx,
            {
                type: 'line',
                data: {
                    datasets: [{
                        data: data.lists.data,
                        label: "PAM Score"
                    }],
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                suggestedMin: 0,
                                suggestedMax: 52
                            }
                        }],
                        xAxes: [{
                            type: 'time',
                            time: {
                                round: 'day',
                                unit: 'day',
                                unitStepSize: 1,
                                tooltipFormat: "h:mm:ss a",
                                displayFormats: {
                                    hour: 'MMM D, h:mm A'
                                }
                            }
                        }]
                    }
                }
            })
    });
});