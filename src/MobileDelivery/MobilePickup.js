import React from 'react';
import Map from '../Map/Map';
import moment from 'moment';
import './Mobile.css';
import { DeliveryStatus, StringFormat } from '../Enums';

import firebase from '../FirebaseConfig';
const db = firebase.database();

class MobilePickup extends React.Component {
    constructor(props){
        super(props); 
        this.onSubmit = this.onSubmit.bind(this);
    }

    onSubmit(e){
        e.preventDefault();
        var pickedUpInfo = {
            temperature: e.target.temp.value,
            signature: e.target.signature.value,
            timestamp: moment().valueOf(),
        };
        // write pickedUpInfo and status change to db
        db.ref(this.props.dbRef).update({ status: DeliveryStatus.PICKED_UP, pickedUpInfo: pickedUpInfo});
    }

    render() {
        return (
            <div className="mobile-delivery">
                <div className="mobile-header">
                    <p><span id="ms-highlight">Pickup</span> | <span id="mobile-header-pickup">Deliver</span> | <span id="mobile-header-pickup">Complete</span></p>
                </div>
                <div className="mobile-card">
                    <div className="mobile-card-line"></div>
                    <p className="ms-header">{this.props.da.agency}</p>
                    <p className="ms-pickup-time">Pickup between {moment(this.props.deliveryObj.startTime).format(StringFormat.TIME)} &ndash; {moment(this.props.deliveryObj.endTime).format(StringFormat.TIME)}</p>
                    <Map 
                        marginLeft="20px" 
                        height="90px" 
                        width="90%" 
                        marginTop="10px" 
                        marginRight="0px"
                        marginBottom="8px"
                        address={this.props.da.address}/>
                    <div className="ms-content">
                        <div id="ms-notes">
                            <p className="ms-content-header">Notes</p>
                            <p className="ms-notes">{this.props.deliveryObj.notes}</p>
                        </div>
                        <div id="ms-contact">
                            <p className="ms-content-header">Contact</p>
                            <p id="ms-name">{this.props.da.primaryContact.name}</p>
                            <p id="ms-position">{this.props.da.primaryContact.position}</p>
                            <a href={'tel:' + this.props.da.primaryContact.phone}>{this.props.da.primaryContact.phone}</a>
                        </div>
                    </div>
                    <form onSubmit={this.onSubmit}>
                        <div className="ms-temp">
                            <p className="ms-content-header">Temperature Directions</p>
                            <p className="ms-notes">Take the initial temperature of the freezer where the food being delivered is stored before delivering.</p>
                            {/* TODO: validate input in less than 32 degrees */}
                            <input name="temp" className="ms-input" type="number" placeholder="Freezer Temperature" required/>
                        </div>
                        <div id="ms-confirm">
                            <p className="ms-content-header">Confirmation Signature</p>
                            <p className="ms-notes">Get a confirmation signature from {this.props.da.primaryContact.name} at {this.props.da.agency} after you pick-up food items at the destination.</p>
                            {/* TODO: Signature */}
                            <input name="signature" className="ms-signature" type="text" placeholder="Signature" required/>
                        </div>
                        <input type="submit" value="Next" id="ms-next-btn"/> 
                    </form>
                </div>
                
                
            </div>
        );
    }
}

export default MobilePickup;