import React, { Component } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as d3Shape from "d3-shape";

import Svg, { G, Path, Text, TSpan } from "react-native-svg";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const { width: screenWidth, height: screenHeight } = Dimensions.get("screen");

class WheelOfFortune extends Component {
  constructor(props) {
    super(props);
    this.width = this.props.options.width || screenWidth;
    this.height = this.props.options.height || screenHeight;
    this.angle = 0;

    this.state = {
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      gameScreen: new Animated.Value(this.width - 40),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(this.width / 2 - 30),
      imageTop: new Animated.Value(this.height / 2 - 70),
    };
    this.prepareWheel();
  }

  prepareWheel = () => {
    this.Rewards = !!this.props.options.shuffle
      ? this.props.options.rewards.sort(() => 0.5 - Math.random())
      : this.props.options.rewards;
    this.RewardCount = this.Rewards.length;

    this.numberOfSegments = this.RewardCount;
    this.fontSize = 20;
    this.oneTurn = 360;
    this.angleBySegment = this.oneTurn / this.numberOfSegments;
    this.angleOffset = this.angleBySegment / 2;
    this.winner = this.props.options.winner
      ? this.props.options.winner
      : Math.floor(Math.random() * this.numberOfSegments);

    this._wheelPaths = this.makeWheel();
    this._angle = new Animated.Value(0);

    this.props.options.onRef(this);
  };

  angleListener = () => {
    this._angle.addListener((event) => {
      if (this.state.enabled) {
        this.setState({
          enabled: false,
          finished: false,
        });
      }

      this.angle = event.value;
    });
  };

  componentWillUnmount() {
    this.props.options.onRef(undefined);
  }

  componentDidMount() {
    this.angleListener();
  }

  makeWheel = () => {
    const data = Array.from({ length: this.numberOfSegments }).fill(1);
    const arcs = d3Shape.pie()(data);
    const colors = this.props.options.colors
      ? this.props.options.colors
      : [
          "#E07026",
          "#E8C22E",
          "#ABC937",
          "#4F991D",
          "#22AFD3",
          "#5858D0",
          "#7B48C8",
          "#D843B9",
          "#E23B80",
          "#D82B2B",
        ];
    return arcs.map((arc, index) => {
      const instance = d3Shape
        .arc()
        .padAngle(0.01)
        .outerRadius(this.width / 2)
        .innerRadius(this.props.options.innerRadius || 100);
      return {
        path: instance(arc),
        color: colors[index % colors.length],
        value: this.Rewards[index],
        centroid: instance.centroid(arc),
      };
    });
  };

  _getWinnerIndex = () => {
    const deg = Math.abs(Math.round(this.angle % this.oneTurn));
    // wheel turning counterclockwise
    if (this.angle < 0) {
      return Math.floor(deg / this.angleBySegment);
    }
    // wheel turning clockwise
    return (
      (this.numberOfSegments - Math.floor(deg / this.angleBySegment)) %
      this.numberOfSegments
    );
  };

  start = () => {
    const duration = this.props.options.duration || 10000;

    this.setState({ started: true });

    Animated.timing(this._angle, {
      toValue:
        365 -
        this.winner * (this.oneTurn / this.numberOfSegments) +
        360 * (duration / 1000),
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      const winnerIndex = this._getWinnerIndex();
      this.setState({
        finished: true,
        winner: this._wheelPaths[winnerIndex].value,
      });
      this.props.getWinner(this._wheelPaths[winnerIndex].value, winnerIndex);
    });
  };

  _textRender = (x, y, number, index) => {
    const colors = this.props.options.textColors
      ? this.props.options.textColors
      : ["#fff"];

    return (
      <Text
        x={x - number.length * 5}
        y={y - 80}
        fill={colors[index % colors.length]}
        textAnchor="middle"
        fontSize={this.fontSize}
        fontWeight={this.props.options.fontWeight || "normal"}
      >
        {Array.from({ length: number.length }).map((_, j) => {
          // Render reward text vertically
          if (this.props.options.textAngle === "vertical") {
            return (
              <TSpan x={x} dy={this.fontSize} key={`arc-${index}-slice-${j}`}>
                {number.charAt(j)}
              </TSpan>
            );
          }
          // Render reward text horizontally
          else {
            return (
              <TSpan
                y={y - 40}
                dx={this.fontSize * 0.07}
                key={`arc-${index}-slice-${j}`}
              >
                {number.charAt(j)}
              </TSpan>
            );
          }
        })}
      </Text>
    );
  };

  _renderSvgWheel = () => {
    return (
      <View style={styles.container}>
        {this._renderKnob()}
        <Animated.View
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: [
              {
                rotate: this._angle.interpolate({
                  inputRange: [-this.oneTurn, 0, this.oneTurn],
                  outputRange: [
                    `-${this.oneTurn}deg`,
                    `0deg`,
                    `${this.oneTurn}deg`,
                  ],
                }),
              },
            ],
            backgroundColor: this.props.options.backgroundColor
              ? this.props.options.backgroundColor
              : "#fff",
            width: this.width - 20,
            height: this.width - 20,
            borderRadius: (this.width - 20) / 2,
            borderWidth: this.props.options.borderWidth
              ? this.props.options.borderWidth
              : 2,
            borderColor: this.props.options.borderColor
              ? this.props.options.borderColor
              : "#fff",
            opacity: this.state.wheelOpacity,
          }}
        >
          <AnimatedSvg
            width={this.state.gameScreen}
            height={this.state.gameScreen}
            viewBox={`0 0 ${this.width} ${this.width}`}
            style={{
              transform: [{ rotate: `-${this.angleOffset}deg` }],
              margin: 10,
            }}
          >
            <G y={this.width / 2} x={this.width / 2}>
              {this._wheelPaths.map((arc, i) => {
                const [x, y] = arc.centroid;
                const number = arc.value.toString();

                return (
                  <G key={`arc-${i}`}>
                    <Path d={arc.path} strokeWidth={2} fill={arc.color} />
                    <G
                      rotation={
                        (i * this.oneTurn) / this.numberOfSegments +
                        this.angleOffset
                      }
                      origin={`${x}, ${y}`}
                    >
                      {this._textRender(x, y, number, i)}
                    </G>
                  </G>
                );
              })}
            </G>
          </AnimatedSvg>
        </Animated.View>
      </View>
    );
  };

  _renderKnob = () => {
    const knobSize = this.props.options.knobSize
      ? this.props.options.knobSize
      : 20;
    // [0, this.numberOfSegments]
    const YOLO = Animated.modulo(
      Animated.divide(
        Animated.modulo(
          Animated.subtract(this._angle, this.angleOffset),
          this.oneTurn
        ),
        new Animated.Value(this.angleBySegment)
      ),
      1
    );

    return (
      <Animated.View
        style={{
          ...this.props.options.knobStyle,
          opacity: this.state.wheelOpacity,
          justifyContent: "flex-end",
          zIndex: 1,
          width: knobSize,
          height: knobSize * 2,
          transform: [
            {
              rotate: YOLO.interpolate({
                inputRange: [-1, -0.5, -0.0001, 0.0001, 0.5, 1],
                outputRange: [
                  "0deg",
                  "0deg",
                  "35deg",
                  "-35deg",
                  "0deg",
                  "0deg",
                ],
              }),
            },
          ],
        }}
      >
        <Svg
          width={knobSize}
          height={(knobSize * 100) / 57}
          viewBox={`0 0 57 100`}
          style={{
            transform: [{ translateY: 8 }],
          }}
        >
          <Image
            source={
              this.props.options.knobSource
                ? this.props.options.knobSource
                : require("../assets/images/knob.png")
            }
            style={{ width: knobSize, height: (knobSize * 100) / 57 }}
          />
        </Svg>
      </Animated.View>
    );
  };

  _renderTopToPlay() {
    if (this.state.started === false) {
      return (
        <TouchableOpacity onPress={() => this.start()}>
          {this.props.options.playButton()}
        </TouchableOpacity>
      );
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Animated.View style={styles.content}>
          {this._renderSvgWheel()}
        </Animated.View>
        {this.props.options.playButton ? this._renderTopToPlay() : null}
      </View>
    );
  }
}

export default WheelOfFortune;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 10,
  },
});
