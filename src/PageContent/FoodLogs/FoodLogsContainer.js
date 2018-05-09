import React, { Component } from 'react';
import './FoodLogsContainer.css';
import FoodLogItem from './FoodLogItem';
import { AccountType, DeliveryStatus } from '../../Enums';
import { accountsRef, deliveriesRef, deliveryIndicesRef, donatingAgenciesRef } from '../../FirebaseConfig';
import pick from 'lodash.pick';

class FoodLogsContainer extends Component {
    constructor(props){
        super(props);
        this.state = {
            deliveries:[]
        };
    }

    async componentDidMount(){
        const rawDeliveries = await this.fetchDeliveries();
        this.aggrFoodLogsInfo(rawDeliveries);
    }

    async fetchDeliveries() {
        const { account } = this.props; 
        const agencyUid = 
            account.accountType === AccountType.DONATING_AGENCY_MEMBER ? 
            account.agency : account.uid; 
        // get all deliveries' ids of this agency 
        const deliveiesIdList = [];
        const deliveriesIdSnapshot = await deliveryIndicesRef.child(`${account.umbrella}/${agencyUid}`).once('value');
        deliveriesIdSnapshot.forEach(dailyDeliveriesIdSnapshot =>
            dailyDeliveriesIdSnapshot.forEach(deliveryId => {
                deliveiesIdList.push(deliveryId.key);
            })
        );
        // construct and resolve promises to fetch all deliveries
        const deliveryPromisesList = deliveiesIdList.map(deliveryId => 
            new Promise( async (resolve, reject) => {
                const rawDelivery = await deliveriesRef.child(deliveryId).once('value');
                resolve(rawDelivery.val());
        }));
        return Promise.all(deliveryPromisesList);
    }

    async aggrFoodLogsInfo(rawDeliveries) {    
        const filteredRawDeliveries = rawDeliveries.filter(
            rawDelivery => rawDelivery.status === DeliveryStatus.COMPLETED
        );
        const agenciesInfoPromisesList = filteredRawDeliveries.map(rawDelivery => {
            const agenciesInfoPromise = this.makeAgenciesInfoPromise( 
                rawDelivery.delivererGroup,
                rawDelivery.receivingAgency, 
                rawDelivery.donatingAgency, 
                rawDelivery.daContact,
            );
            return new Promise( async (resolve, reject) => {
                const agenciesInfo = await Promise.all(agenciesInfoPromise);
                resolve(agenciesInfo);
            });
        });
        const agenciesInfoList = await Promise.all(agenciesInfoPromisesList);
        this.aggrDeliveries(filteredRawDeliveries, agenciesInfoList);
    }


    makeAgenciesInfoPromise(dgId, raId, daId, daContactId) {
        const dgPromise = new Promise( async (resolve, reject) => {
            const dgSnapshot = await accountsRef.child(dgId).once('value');
            resolve(dgSnapshot.val());
        });
        const raPromise = new Promise( async (resolve, reject) => {
            const raSnapshot = await accountsRef.child(raId).once('value');
            resolve(raSnapshot.val());
        });
        const daPromise = new Promise( async (resolve, reject) => {
            const daSnapshot = await donatingAgenciesRef.child(daId).once('value');
            resolve(daSnapshot.val());
        });
        const daContactPromise = new Promise( async (resolve, reject) => {
            const daSnapshot = await accountsRef.child(daContactId).once('value');
            resolve(daSnapshot.val());
        });
        return [dgPromise, raPromise, daPromise, daContactPromise]; 
    }
    
    aggrDeliveries(rawDeliveries, agenciesInfoList) {
        const deliveries = rawDeliveries.map((delivery, i) => {
            const agenciesInfo = agenciesInfoList[i];
            const dgInfo = agenciesInfo[0];
            const raInfo = agenciesInfo[1];
            const daInfo = agenciesInfo[2];
            const daContactInfo = agenciesInfo[3];
            delivery.delivererGroup = dgInfo.name;
            delivery.receivingAgency = raInfo.name;
            delivery.donatingAgency = daInfo.name;
            delivery.daContact = pick(daContactInfo, ['name', 'phone']);
            return delivery;
        })
        this.setState({deliveries: deliveries});
    }

    render(){
        return(
            <div className="food-container ">
                {/* TODO: Filter feature */}
                {this.state.deliveries.length > 0 ?
                    this.state.deliveries.map((completedDelivery, i) => {
                        return (
                            <FoodLogItem delivery={completedDelivery} key={i}/>
                        );
                    })
                    :
                    (<h3 className="nothing-found-propmt">No Food Logss Found</h3>)
                }
            </div>
        );
    }
}
export default FoodLogsContainer;