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
            });

        console.log(data.questions);
        data.questions.data.forEach(function (dataSet) {
            console.log(dataSet);
            ctx = $('#questionnare_per_question_' + dataSet.label)[0].getContext('2d')
            question_chart = new Chart(ctx,
                {
                    type: 'line',
                    data: {
                        datasets: [{
                            data: dataSet.data,
                            label: 'Vraag ' + dataSet.label
                        }]
                    },
                    options: {
                        scales: {
                            yAxes: [{
                                ticks: {
                                    suggestedMin: 0,
                                    suggestedMax: 5
                                }
                            }],
                            xAxes: [{
                                type: 'time',
                                time: {
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
});