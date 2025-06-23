import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';
import createTraining from '@salesforce/apex/TrainingController.createTraining';
import updateTraining from '@salesforce/apex/TrainingController.updateTraining';
import deleteTraining from '@salesforce/apex/TrainingController.deleteTraining';
import getUpcomingTrainings from '@salesforce/apex/TrainingController.getUpcomingTrainings';
import getCoaches from '@salesforce/apex/TrainingController.getCoaches';
import isCoach from '@salesforce/apex/UserRoleHelper.isCoach';
import isAdmin from '@salesforce/apex/UserRoleHelper.isAdmin';

export default class TrainingManagement extends NavigationMixin(LightningElement) {
    @track selectedTeamId = '';
    @track trainings = [];
    @track isModalOpen = false;
    @track isEditMode = false;
    @track editingTrainingId = null;
    @track hasAccess = false;
    @track newTraining = {
        teamId: '',
        date: '',
        startTime: '',
        duration: '',
        type: '',
        coachId: ''
    };

    teamOptions = [];
    coachOptions = [];
    wiredTrainingsResult;

    typeOptions = [
        { label: 'Taktyczny', value: 'Taktyczny' },
        { label: 'Kondycyjny', value: 'Kondycyjny' },
        { label: 'Techniczny', value: 'Techniczny' }
    ];

    columns = [
        { label: 'Numer', fieldName: 'Name', type: 'text' },
        { label: 'Data', fieldName: 'Training_Date__c', type: 'date' },
        { 
            label: 'Godzina', 
            fieldName: 'FormattedTime', 
            type: 'text' 
        },
        { label: 'Czas trwania (min)', fieldName: 'Duration__c', type: 'number' },
        { label: 'Typ', fieldName: 'Type__c', type: 'text' },
        { label: 'Drużyna', fieldName: 'TeamName', type: 'text' },
        { label: 'Trener', fieldName: 'CoachName', type: 'text' },
        {
            type: 'action',
            typeAttributes: { rowActions: this.getRowActions }
        }
    ];

    getRowActions(row, doneCallback) {
        const actions = [
            { label: 'Edytuj', name: 'edit' },
            { label: 'Usuń', name: 'delete' },
            { label: 'Lista obecności', name: 'attendance' }
        ];
        doneCallback(actions);
    }

    @wire(isAdmin)
    wiredIsAdmin({ error, data }) {
        if (data !== undefined) {
            this.hasAccess = data;
        }
    }

    @wire(isCoach)
    wiredIsCoach({ error, data }) {
        if (data !== undefined && !this.hasAccess) {
            this.hasAccess = data;
        }
    }

    @wire(getCoaches)
    wiredCoaches(result) {
        if (result.data) {
            this.coachOptions = result.data.map(coach => ({
                label: coach.Name,
                value: coach.Id
            }));
        }
    }

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
        if (result.data && this.selectedTeamId) {
            this.trainings = result.data.map(training => {
                let formattedTime = '';
                if (training.Start_Time__c) {
                    const totalMilliseconds = training.Start_Time__c;
                    const totalSeconds = Math.floor(totalMilliseconds / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
                
                return {
                    ...training,
                    TeamName: training.Team__r ? training.Team__r.Name : '',
                    CoachName: training.Coach__r ? training.Coach__r.Name : 'Nie przypisano',
                    FormattedTime: formattedTime || 'Brak'
                };
            });
        } else if (result.error) {
            this.showToast('Błąd', 'Nie udało się pobrać treningów', 'error');
        }
    }

    handleTeamChange(event) {
        this.selectedTeamId = event.detail.value;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        switch (actionName) {
            case 'delete':
                this.handleDelete(row.Id);
                break;
            case 'edit':
                this.handleEdit(row);
                break;
            case 'attendance':
                this.navigateToAttendance(row.Id, row.Team__c);
                break;
            default:
        }
    }

    handleEdit(training) {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania treningami', 'error');
            return;
        }
        
        this.isEditMode = true;
        this.editingTrainingId = training.Id;
        
        let timeString = '';
        if (training.Start_Time__c) {
            const totalMilliseconds = training.Start_Time__c;
            const totalSeconds = Math.floor(totalMilliseconds / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        
        this.newTraining = {
            teamId: training.Team__c,
            date: training.Training_Date__c,
            startTime: timeString,
            duration: training.Duration__c || 90,
            type: training.Type__c,
            coachId: training.Coach__c
        };
        
        this.isModalOpen = true;
    }

    async handleDelete(trainingId) {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania treningami', 'error');
            return;
        }
        
        if (confirm('Czy na pewno chcesz usunąć ten trening?')) {
            try {
                await deleteTraining({ trainingId });
                this.showToast('Sukces', 'Trening został usunięty', 'success');
                refreshApex(this.wiredTrainingsResult);
            } catch (error) {
                this.showToast('Błąd', error.body.message, 'error');
            }
        }
    }

    navigateToAttendance(trainingId, teamId) {
        const url = `/lightning/o/SportAttendance__c/list?c__trainingId=${trainingId}&c__teamId=${teamId}`;
        window.open(url, '_blank');
    }

    openModal() {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania treningami', 'error');
            return;
        }
        this.isModalOpen = true;
        this.isEditMode = false;
        this.editingTrainingId = null;
        this.newTraining = {
            teamId: this.selectedTeamId,
            date: '',
            startTime: '',
            duration: '90',
            type: '',
            coachId: ''
        };
    }

    closeModal() {
        this.isModalOpen = false;
        this.isEditMode = false;
        this.editingTrainingId = null;
        this.newTraining = {
            teamId: '',
            date: '',
            startTime: '',
            duration: '',
            type: '',
            coachId: ''
        };
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this.newTraining[field] = event.target.value;
    }

    async handleSave() {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania treningami', 'error');
            return;
        }
        
        try {
            if (!this.newTraining.teamId || !this.newTraining.date || !this.newTraining.startTime || !this.newTraining.type) {
                this.showToast('Błąd', 'Wszystkie pola oprócz czasu trwania są wymagane', 'error');
                return;
            }

            if (this.isEditMode) {
                await updateTraining({
                    trainingId: this.editingTrainingId,
                    trainingDate: this.newTraining.date,
                    startTime: this.newTraining.startTime,
                    duration: parseInt(this.newTraining.duration) || 90,
                    trainingType: this.newTraining.type,
                    coachId: this.newTraining.coachId
                });
                this.showToast('Sukces', 'Trening został zaktualizowany', 'success');
            } else {
                await createTraining({
                    teamId: this.newTraining.teamId,
                    trainingDate: this.newTraining.date,
                    startTime: this.newTraining.startTime,
                    duration: parseInt(this.newTraining.duration) || 90,
                    trainingType: this.newTraining.type,
                    coachId: this.newTraining.coachId
                });
                this.showToast('Sukces', 'Trening został utworzony i automatycznie utworzone zostały rekordy frekwencji', 'success');
            }
            
            this.closeModal();
            refreshApex(this.wiredTrainingsResult);
        } catch (error) {
            this.showToast('Błąd', error.body.message, 'error');
        }
    }

    get modalTitle() {
        return this.isEditMode ? 'Edytuj Trening' : 'Nowy Trening';
    }

    get saveButtonLabel() {
        return this.isEditMode ? 'Zaktualizuj' : 'Zapisz';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }
}