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
        ctx = $('#blood')[0].getContext('2d')
        question_chart = new Chart(ctx,
            {
                type: 'line',
                data: {
                    datasets: [{
                        yAxisID: 'Pressure',
                        data: data.blood.systolic,
                        borderColor: 'rgba(255, 0, 0, 0)',
                        label: 'Systolisch'
                    },
                    {
                        yAxisID: 'Pressure',
                        data: data.blood.diastolic,
                        borderColor: 'rgba(0, 255, 0, 0)',
                        label: 'Diastolisch'
                    },
                    {
                        yAxisID: 'Pulse',
                        data: data.blood.pulse,
                        borderColor: 'rgba(0, 0, 255, 0)',
                        label: 'Hartslag'
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            id: 'Pressure',
                            type: 'linear'
                            ticks: [{
                                min: 40,
                                max: 250
                            }]
                        }, {
                            id: 'Pulse',
                            type: 'linear'
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

        ctx = $('#weight')[0].getContext('2d')
        question_chart = new Chart(ctx,
            {
                type: 'line',
                data: {
                    datasets: [{
                        data: data.weight.data,
                        label: 'Gewicht'
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            type: 'linear'
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