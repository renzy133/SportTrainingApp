import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';
import createTraining from '@salesforce/apex/TrainingController.createTraining';
import getUpcomingTrainings from '@salesforce/apex/TrainingController.getUpcomingTrainings';

export default class TrainingManagement extends LightningElement {
    @track selectedTeamId = '';
    @track trainings = [];
    @track isModalOpen = false;
    @track newTraining = {
        teamId: '',
        date: '',
        startTime: '',
        duration: '',
        type: ''
    };

    teamOptions = [];

    typeOptions = [
        { label: 'Taktyczny', value: 'Taktyczny' },
        { label: 'Kondycyjny', value: 'Kondycyjny' },
        { label: 'Techniczny', value: 'Techniczny' }
    ];

    columns = [
        { label: 'Numer', fieldName: 'Name', type: 'text' },
        { label: 'Data', fieldName: 'Training_Date__c', type: 'date' },
        { label: 'Godzina', fieldName: 'Start_Time__c', type: 'text' },
        { label: 'Czas trwania (min)', fieldName: 'Duration__c', type: 'number' },
        { label: 'Typ', fieldName: 'Type__c', type: 'text' },
        { label: 'Drużyna', fieldName: 'TeamName', type: 'text' }
    ];

    @wire(getActiveTeams)
    wiredTeams(result) {
        if (result.data) {
            this.teamOptions = result.data.map(team => ({
                label: team.Name,
                value: team.Id
            }));
            
            if (this.teamOptions.length > 0 && !this.selectedTeamId) {
                this.selectedTeamId = this.teamOptions[0].value;
            }
        }
    }

    @wire(getUpcomingTrainings, { teamId: '$selectedTeamId' })
    wiredTrainings(result) {
        this.wiredTrainingsResult = result;
        if (result.data) {
            this.trainings = result.data.map(training => ({
                ...training,
                TeamName: training.Team__r ? training.Team__r.Name : ''
            }));
        } else if (result.error) {
            this.showToast('Błąd', 'Nie udało się pobrać treningów', 'error');
        }
    }

    handleTeamChange(event) {
        this.selectedTeamId = event.detail.value;
    }

    openModal() {
        this.isModalOpen = true;
        this.newTraining.teamId = this.selectedTeamId;
    }

    closeModal() {
        this.isModalOpen = false;
        this.newTraining = {
            teamId: '',
            date: '',
            startTime: '',
            duration: '',
            type: ''
        };
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this.newTraining[field] = event.target.value;
    }

    async handleSave() {
        try {
            if (!this.newTraining.teamId || !this.newTraining.date || !this.newTraining.startTime || !this.newTraining.type) {
                this.showToast('Błąd', 'Wszystkie pola oprócz czasu trwania są wymagane', 'error');
                return;
            }

            await createTraining({
                teamId: this.newTraining.teamId,
                trainingDate: this.newTraining.date,
                startTime: this.newTraining.startTime,
                duration: parseInt(this.newTraining.duration) || 90,
                trainingType: this.newTraining.type
            });

            this.showToast('Sukces', 'Trening został utworzony i automatycznie utworzone zostały rekordy frekwencji', 'success');
            this.closeModal();
            refreshApex(this.wiredTrainingsResult);
        } catch (error) {
            this.showToast('Błąd', error.body.message, 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }
}