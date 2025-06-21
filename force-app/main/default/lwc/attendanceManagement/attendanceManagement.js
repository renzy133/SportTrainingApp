import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import getUpcomingTrainings from '@salesforce/apex/TrainingController.getUpcomingTrainings';
import getTrainingAttendance from '@salesforce/apex/AttendanceManager.getTrainingAttendance';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';
import ID_FIELD from '@salesforce/schema/SportAttendance__c.Id';
import STATUS_FIELD from '@salesforce/schema/SportAttendance__c.Status__c';
import NOTES_FIELD from '@salesforce/schema/SportAttendance__c.Notes__c';

export default class AttendanceManagement extends LightningElement {
    @track selectedTeamId = '';
    @track selectedTrainingId = '';
    @track trainings = [];
    @track attendanceRecords = [];
    @track editMode = false;

    teamOptions = [];
    trainingOptions = [];

    statusOptions = [
        { label: 'Obecny', value: 'Obecny' },
        { label: 'Nieobecny', value: 'Nieobecny' },
        { label: 'Usprawiedliwiony', value: 'Usprawiedliwiony' }
    ];

    columns = [
        { label: 'Zawodnik', fieldName: 'PlayerName', type: 'text' },
        { 
            label: 'Status', 
            fieldName: 'Status__c', 
            type: 'picklistColumn',
            typeAttributes: {
                placeholder: 'Wybierz status',
                options: { fieldName: 'statusOptions' },
                value: { fieldName: 'Status__c' },
                context: { fieldName: 'Id' }
            },
            editable: true
        },
        { label: 'Notatki', fieldName: 'Notes__c', type: 'text', editable: true }
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
            this.trainings = result.data;
            this.trainingOptions = result.data.map(training => ({
                label: `${training.Name} - ${training.Training_Date__c} ${training.Start_Time__c || ''}`,
                value: training.Id
            }));
            
            if (this.trainingOptions.length > 0 && !this.selectedTrainingId) {
                this.selectedTrainingId = this.trainingOptions[0].value;
            }
        }
    }

    @wire(getTrainingAttendance, { trainingId: '$selectedTrainingId' })
    wiredAttendance(result) {
        this.wiredAttendanceResult = result;
        if (result.data) {
            this.attendanceRecords = result.data.map(record => ({
                ...record,
                PlayerName: record.Player__r ? record.Player__r.Name : '',
                statusOptions: this.statusOptions
            }));
        } else if (result.error) {
            this.showToast('Błąd', 'Nie udało się pobrać listy obecności', 'error');
        }
    }

    handleTeamChange(event) {
        this.selectedTeamId = event.detail.value;
        this.selectedTrainingId = '';
        this.attendanceRecords = [];
    }

    handleTrainingChange(event) {
        this.selectedTrainingId = event.detail.value;
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
    }

    async handleSave(event) {
        try {
            const draftValues = event.detail.draftValues;
            const recordInputs = draftValues.map(draft => {
                const fields = {};
                fields[ID_FIELD.fieldApiName] = draft.Id;
                if (draft.Status__c) fields[STATUS_FIELD.fieldApiName] = draft.Status__c;
                if (draft.Notes__c !== undefined) fields[NOTES_FIELD.fieldApiName] = draft.Notes__c;
                return { fields };
            });

            const promises = recordInputs.map(recordInput => updateRecord(recordInput));
            await Promise.all(promises);

            this.showToast('Sukces', 'Lista obecności została zaktualizowana', 'success');
            
            // Clear draft values
            this.template.querySelector('lightning-datatable').draftValues = [];
            
            // Refresh the data
            refreshApex(this.wiredAttendanceResult);
            
        } catch (error) {
            this.showToast('Błąd', 'Nie udało się zaktualizować listy obecności', 'error');
        }
    }

    handleCancel() {
        // Clear draft values
        this.template.querySelector('lightning-datatable').draftValues = [];
    }

    get hasAttendanceData() {
        return this.attendanceRecords && this.attendanceRecords.length > 0;
    }

    get presentCount() {
        return this.attendanceRecords.filter(record => record.Status__c === 'Obecny').length;
    }

    get absentCount() {
        return this.attendanceRecords.filter(record => record.Status__c === 'Nieobecny').length;
    }

    get excusedCount() {
        return this.attendanceRecords.filter(record => record.Status__c === 'Usprawiedliwiony').length;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }
}