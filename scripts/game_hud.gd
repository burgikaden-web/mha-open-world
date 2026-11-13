extends CanvasLayer

var status_label: Label
var help_label: Label

func _ready() -> void:
	var root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	var title = Label.new()
	title.text = "RISING LEGACY  //  MUSUTAFU DISTRICT"
	title.position = Vector2(34,24)
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color(0.65,0.88,1.0))
	root.add_child(title)
	status_label = Label.new()
	status_label.text = "VITALS  100     QUIRK ENERGY  100"
	status_label.position = Vector2(34,64)
	status_label.add_theme_font_size_override("font_size", 17)
	root.add_child(status_label)
	help_label = Label.new()
	help_label.text = "WASD Move   SHIFT Sprint   SPACE Jump   E Punch   Q Quirk Burst   ESC Mouse"
	help_label.anchor_left = 0.5
	help_label.anchor_top = 1.0
	help_label.anchor_right = 0.5
	help_label.anchor_bottom = 1.0
	help_label.position = Vector2(-300,-58)
	help_label.add_theme_font_size_override("font_size", 16)
	root.add_child(help_label)
	var dot = Label.new()
	dot.text = "+"
	dot.anchor_left = 0.5
	dot.anchor_top = 0.5
	dot.anchor_right = 0.5
	dot.anchor_bottom = 0.5
	dot.position = Vector2(-7,-15)
	dot.add_theme_font_size_override("font_size", 28)
	dot.add_theme_color_override("font_color", Color(0.8,0.95,1.0))
	root.add_child(dot)
