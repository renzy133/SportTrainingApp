import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';

export default class SportsDashboard extends LightningElement {
    @track teams = [];
    @track chartData = [];
    chartJsInitialized = false;

    @wire(getActiveTeams)
    wiredTeams({ error, data }) {
        if (data) {
            this.teams = data;
            this.processChartData();
        } else if (error) {
            console.error('Error fetching teams', error);
        }
    }

    processChartData() {
        // Grupowanie drużyn według sportu
        const sportCounts = {};
        const categoryCounts = {};

        this.teams.forEach(team => {
            // Zliczanie według sportu
            if (sportCounts[team.Sport__c]) {
                sportCounts[team.Sport__c]++;
            } else {
                sportCounts[team.Sport__c] = 1;
            }

            // Zliczanie według kategorii
            if (categoryCounts[team.Category__c]) {
                categoryCounts[team.Category__c]++;
            } else {
                categoryCounts[team.Category__c] = 1;
            }
        });

        this.sportChartData = {
            labels: Object.keys(sportCounts),
            datasets: [{
                data: Object.values(sportCounts),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB', 
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        };

        this.categoryChartData = {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    '#FF9F40',
                    '#FF6384',
                    '#4BC0C0'
                ]
            }]
        };
    }

    renderedCallback() {
        if (this.chartJsInitialized) {
            return;
        }
        this.chartJsInitialized = true;

        // Simulacja wykresów bez Chart.js
        this.createSimpleCharts();
    }

    createSimpleCharts() {
        // Proste wykresy SVG zamiast Chart.js
        const sportChart = this.template.querySelector('[data-id="sport-chart"]');
        const categoryChart = this.template.querySelector('[data-id="category-chart"]');

        if (sportChart && this.teams.length > 0) {
            this.renderSVGChart(sportChart, this.sportChartData, 'Drużyny według Sportu');
        }
        
        if (categoryChart && this.teams.length > 0) {
            this.renderSVGChart(categoryChart, this.categoryChartData, 'Drużyny według Kategorii');
        }
    }

    renderSVGChart(container, data, title) {
        const colors = ['#0176D3', '#16325C', '#5F6A7A', '#8492A6'];
        let total = data.datasets[0].data.reduce((a, b) => a + b, 0);
        
        container.innerHTML = `
            <div class="slds-text-heading_medium slds-m-bottom_small">${title}</div>
            <div class="slds-grid slds-wrap">
                ${data.labels.map((label, index) => {
                    const value = data.datasets[0].data[index];
                    const percentage = Math.round((value / total) * 100);
                    return `
                        <div class="slds-col slds-size_1-of-2 slds-p-around_small">
                            <div class="slds-media">
                                <div class="slds-media__figure">
                                    <div style="width: 20px; height: 20px; background-color: ${colors[index % colors.length]}; border-radius: 3px;"></div>
                                </div>
                                <div class="slds-media__body">
                                    <div class="slds-text-body_small">${label}</div>
                                    <div class="slds-text-heading_small">${value} (${percentage}%)</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    get totalTeams() {
        return this.teams.length;
    }

    get totalActivePlayers() {
        // Symulacja - w rzeczywistości pobieralibyśmy z Apex
        return this.teams.length * 15; // Przeciętnie 15 graczy na drużynę
    }

    get upcomingTrainings() {
        // Symulacja - w rzeczywistości pobieralibyśmy z Apex
        return this.teams.length * 3; // 3 treningi na drużynę
    }
}