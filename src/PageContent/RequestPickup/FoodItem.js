import React, { Component } from 'react';
import add from '../../icons/plus-button-blue.svg';

class FoodItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            foodName: '',
            foodWeight: ''
        };
    }

    changeName(e) {
        this.setState({
            foodName: e.target.value
        });
    }

    changeWeight(e) {
        this.setState({
            foodWeight: e.target.value
        });
    }

    render() {
        return (
            <div>
                <span className="flex">
                    <span className="grid">
                        <label>Name</label>
                        <br />
                        <input
                            name="foodName"
                            defaultValue=""
                            required
                            onChange={this.changeName.bind(this)}
                        />
                    </span>
                    <span className="grid">
                        <label>Weight</label>
                        <br />
                        <div>
                            <input
                                name="foodWeight"
                                defaultValue=""
                                required
                                onChange={this.changeWeight.bind(this)}
                            />
                        </div>
                    </span>
                </span>
                {this.props.active && (
                    <img
                        className="add-food-item"
                        src={add}
                        alt="add item"
                        onClick={() => {
                            this.props.addFood(
                                this.state.foodName,
                                this.state.foodWeight
                            );
                        }}
                    />
                )}
            </div>
        );
    }
}
export default FoodItem;
