// Simple form validation method.
function validate(form) {
    
    // Grab all the required fields out of this form.
    var required_fields = $("input[data-required-field='true']", form),
        invalid_fields  = 0,
        confirm_fields  = $("input[data-confirm-field]", form);

    // Individually verify each required field is populated.
    required_fields.each(function(index, el) {

        // When any field is empty, have to prevent the form from submitting.
        // Also, display a highlight around invalid fields.
        if(!el.value.length) {
            invalid_fields++;

            $(el).parent().addClass('requiredField');
        } 

        // For valid fields, remove the hightlight if this field was previously highlighted.
        else {
            $(el).parent().removeClass('requiredField');
        }
    });

    confirm_fields.each(function(index, el) {
        var compare_field_name = $(el).attr('data-confirm-field'),
            compare_field = $('input[name='+compare_field_name+']')[0];

        if(compare_field.value != el.value) {
            invalid_fields++;
            $(el).parent().addClass('requiredField');
        }
    });

    // When an error was detected on any field, display an error message and prevent the form
    // from submitting.
    if(invalid_fields) {
        $("#form_error").html("<p>Please fill in the required fields</p>");

        return false;
    }

    return true;
}
